import { inject, Injectable, signal } from '@angular/core';
import {
  Database,
  ref,
  push,
  set,
  onValue,
  off,
  serverTimestamp,
} from '@angular/fire/database';
import { Observable } from 'rxjs';
import type { Difficulty, PuzzleEvent } from 'types';

export interface BaseEvent {
  type: 'cellUpdate' | 'playerJoin' | 'playerLeave';
  playerId: string;
  playerName: string;
  timestamp: number;
}

export interface CellUpdateEvent extends BaseEvent, PuzzleEvent {
  type: 'cellUpdate';
}

export interface PlayerJoinEvent extends BaseEvent {
  type: 'playerJoin';
}

export interface PlayerLeaveEvent extends BaseEvent {
  type: 'playerLeave';
}

export type GameEvent = CellUpdateEvent | PlayerJoinEvent | PlayerLeaveEvent;

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface GameState {
  currentTable: number[][];
  noteTable: boolean[][][];
  completedAt?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CollaborationService {
  private readonly database = inject(Database);

  readonly playerId = signal<string | null>(null);
  readonly playerName = signal<string | null>(null);
  readonly gameId = signal<string | null>(null);

  /**
   *
   * @param originalPuzzle
   * @param solution
   * @param currentTable
   * @param noteTable
   * @param difficulty
   * @param playerName
   * @returns gameId
   */
  async createGame(
    originalPuzzle: number[][],
    solution: number[][],
    currentTable: number[][],
    noteTable: boolean[][][],
    difficulty: string,
    hash: number,
    playerName: string,
    playerId?: string,
    initialTimeElapsed?: number,
  ): Promise<{ gameId: string; playerId: string }> {
    const gamesRef = ref(this.database, 'games');
    const newGameRef = push(gamesRef);
    const gameId = newGameRef.key!;
    const pId = playerId || this.generatePlayerId();

    this.playerId.set(pId);
    this.playerName.set(playerName);
    this.gameId.set(gameId);

    const gameData = {
      metadata: {
        createdAt: serverTimestamp(),
        initialTimeElapsed: initialTimeElapsed || 0,
        createdBy: playerId,
        difficulty,
        originalPuzzle,
        currentTable,
        noteTable,
        solution,
        hash,
        isActive: true,
        lastActivity: serverTimestamp(),
      },
      state: {
        completedAt: null,
      },
      players: {
        [pId]: {
          name: playerName,
          joinedAt: serverTimestamp(),
          isActive: true,
          lastSeen: serverTimestamp(),
        },
      },
    };

    await set(newGameRef, gameData);

    // Add to user's games list
    await set(ref(this.database, `userGames/${playerId}/${gameId}`), true);

    return { gameId, playerId: pId };
  }

  // Join an existing game
  async joinGame(gameId: string, playerName: string, playerId?: string) {
    const pId = playerId || this.generatePlayerId();
    this.playerId.set(pId);
    this.playerName.set(playerName);
    this.gameId.set(gameId);

    try {
      // Check if game exists and is active
      const gameSnapshot = await this.getGameSnapshot(gameId);
      if (!gameSnapshot) {
        throw new Error('Game not found or inactive');
      }

      // Add player to game
      await set(ref(this.database, `games/${gameId}/players/${playerId}`), {
        name: playerName,
        joinedAt: serverTimestamp(),
        isActive: true,
        lastSeen: serverTimestamp(),
      });

      // Add join event
      await this.addGameEvent(gameId, {
        type: 'playerJoin',
        playerId: pId,
        playerName,
        timestamp: Date.now(),
      });

      // Add to user's games list
      await set(ref(this.database, `userGames/${playerId}/${gameId}`), true);

      return gameSnapshot;
    } catch (error) {
      console.error('Failed to join game:', error);
      return false;
    }
  }

  private async getGameSnapshot(gameId: string): Promise<{
    difficulty: Difficulty;
    hash: number;
    isActive: boolean;
    originalPuzzle: number[][];
    currentTable: number[][];
    noteTable: boolean[][][];
    solution: number[][];
    createdAt: number;
    initialTimeElapsed: number;
    createdBy: string;
    lastActivity: number;
  }> {
    const gameRef = ref(this.database, `games/${gameId}/metadata`);
    return new Promise((resolve) => {
      onValue(
        gameRef,
        (snapshot) => {
          resolve(snapshot.val());
        },
        { onlyOnce: true },
      );
    });
  }

  // Update game state
  async logPuzzleEvent(event: PuzzleEvent): Promise<void> {
    const gameId = this.gameId();
    const playerId = this.playerId();
    const playerName = this.playerName();
    if (!gameId || !playerId || !playerName) {
      throw new Error('Not connected to a game');
    }
    const cellRef = ref(
      this.database,
      `games/${gameId}/state/currentTable/${event.r}/${event.c}`,
    );

    await set(cellRef, event.value);
    await this.updateLastActivity(gameId);

    await this.addGameEvent(gameId, {
      type: 'cellUpdate',
      playerId,
      playerName,
      timestamp: Date.now(),
      ...event,
    });
  }

  // Send chat message
  async sendChatMessage(message: string): Promise<void> {
    const gameId = this.gameId();
    const playerId = this.playerId();
    const playerName = this.playerName();
    if (!gameId || !playerId || !playerName) {
      throw new Error('Not connected to a game');
    }
    const chatRef = ref(this.database, `games/${gameId}/chat`);
    const newMessageRef = push(chatRef);

    await set(newMessageRef, {
      playerId,
      playerName,
      message,
      timestamp: serverTimestamp(),
    });

    await this.updateLastActivity(gameId);
  }

  // Subscribe to game state changes
  subscribeToGameState(gameId: string): Observable<GameState> {
    return new Observable((subscriber) => {
      const stateRef = ref(this.database, `games/${gameId}/state`);
      const unsubscribe = onValue(stateRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          subscriber.next(data);
        }
      });

      return () => off(stateRef, 'value', unsubscribe);
    });
  }

  // Subscribe to chat messages
  subscribeToChat(gameId: string): Observable<ChatMessage[]> {
    return new Observable((subscriber) => {
      const chatRef = ref(this.database, `games/${gameId}/chat`);
      const unsubscribe = onValue(chatRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const messages = Object.keys(data)
            .map((key) => data[key])
            .sort((a, b) => a.timestamp - b.timestamp);
          subscriber.next(messages);
        } else {
          subscriber.next([]);
        }
      });

      return () => off(chatRef, 'value', unsubscribe);
    });
  }

  // Subscribe to game events
  subscribeToGameEvents(gameId: string): Observable<GameEvent[]> {
    return new Observable((subscriber) => {
      const eventsRef = ref(this.database, `games/${gameId}/events`);
      const unsubscribe = onValue(eventsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const events = Object.keys(data)
            .map((key) => data[key])
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-50); // Keep only last 50 events
          subscriber.next(events);
        } else {
          subscriber.next([]);
        }
      });

      return () => off(eventsRef, 'value', unsubscribe);
    });
  }

  // Helper methods
  private async addGameEvent(gameId: string, event: GameEvent): Promise<void> {
    const eventsRef = ref(this.database, `games/${gameId}/events`);
    const newEventRef = push(eventsRef);
    await set(newEventRef, event);
  }

  private async updateLastActivity(gameId: string): Promise<void> {
    const lastActivityRef = ref(
      this.database,
      `games/${gameId}/metadata/lastActivity`,
    );
    await set(lastActivityRef, serverTimestamp());
  }

  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
