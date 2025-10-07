import { inject, Injectable } from '@angular/core';
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
import { PuzzleEvent } from '@/../types';

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
  private database = inject(Database);

  async createGame(
    puzzle: number[][],
    solution: number[][],
    difficulty: string,
    playerName: string,
  ): Promise<string> {
    const gamesRef = ref(this.database, 'games');
    const newGameRef = push(gamesRef);
    const gameId = newGameRef.key!;
    const playerId = this.generatePlayerId();

    const gameData = {
      metadata: {
        createdAt: serverTimestamp(),
        createdBy: playerId,
        difficulty,
        originalPuzzle: puzzle,
        solution,
        hash: this.generatePuzzleHash(puzzle),
        isActive: true,
        lastActivity: serverTimestamp(),
      },
      state: {
        completedAt: null,
      },
      players: {
        [playerId]: {
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

    return gameId;
  }

  // Join an existing game
  async joinGame(gameId: string, playerName: string): Promise<boolean> {
    const playerId = this.generatePlayerId();

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
        playerId,
        playerName,
        timestamp: Date.now(),
      });

      // Add to user's games list
      await set(ref(this.database, `userGames/${playerId}/${gameId}`), true);

      return true;
    } catch (error) {
      console.error('Failed to join game:', error);
      return false;
    }
  }

  private async getGameSnapshot(gameId: string) {
    const gameRef = ref(this.database, `games/${gameId}`);
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
  async updateCell(
    gameId: string,
    row: number,
    col: number,
    value: number,
    playerId: string,
    playerName: string,
  ): Promise<void> {
    const cellRef = ref(
      this.database,
      `games/${gameId}/state/currentTable/${row}/${col}`,
    );

    await set(cellRef, value);
    await this.updateLastActivity(gameId);

    await this.addGameEvent(gameId, {
      type: 'cellUpdate',
      playerId,
      playerName,
      timestamp: Date.now(),
      r: row,
      c: col,
      value,
      note: false,
      delete: value === 0,
    });
  }

  // Toggle note
  async toggleNote(
    gameId: string,
    row: number,
    col: number,
    noteValue: number,
    playerId: string,
    playerName: string,
    del: boolean,
  ): Promise<void> {
    const noteRef = ref(
      this.database,
      `games/${gameId}/state/noteTable/${row}/${col}/${noteValue - 1}`,
    );

    await set(noteRef, true);
    await this.updateLastActivity(gameId);

    await this.addGameEvent(gameId, {
      type: 'cellUpdate',
      playerId,
      playerName,
      timestamp: Date.now(),
      r: row,
      c: col,
      value: noteValue,
      note: true,
      delete: del,
    });
  }

  // Send chat message
  async sendChatMessage(
    gameId: string,
    message: string,
    playerId: string,
    playerName: string,
  ): Promise<void> {
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

  private generatePuzzleHash(puzzle: number[][]): string {
    return puzzle.flat().join('');
  }
}
