import { inject, Injectable, signal } from '@angular/core';
import {
  Database,
  ref,
  push,
  set,
  onValue,
  serverTimestamp,
  stateChanges,
  orderByChild,
  endAt,
  query,
  equalTo,
} from '@angular/fire/database';
import { LOCAL_STORAGE_KEYS } from '@/../constants';
import type { Difficulty, PuzzleEvent } from 'types';

export interface BaseEvent {
  type:
    | 'cellUpdate'
    | 'playerJoin'
    | 'playerLeave'
    | 'quickPencil'
    | 'playerNameChange'
    | 'puzzleComplete';
  playerId: string;
  playerName: string;
  timestamp: number;
  id: string;
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

export interface QuickPencilEvent extends BaseEvent {
  type: 'quickPencil';
}

export interface PlayerNameChangeEvent extends BaseEvent {
  type: 'playerNameChange';
  oldName: string;
  newName: string;
}

export type PuzzleCompleteEvent = BaseEvent & {
  type: 'puzzleComplete';
};

export type GameEvent =
  | CellUpdateEvent
  | PlayerJoinEvent
  | PlayerLeaveEvent
  | QuickPencilEvent
  | PlayerNameChangeEvent
  | PuzzleCompleteEvent;

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  id: string;
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
  readonly joinedAt = signal<number | null>(null);
  readonly difficulty = signal<Difficulty | null>(null);
  readonly initialTimeElapsed = signal<number>(0);
  readonly createdAt = signal<number | null>(null);

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
    playerId?: string,
    initialTimeElapsed?: number,
  ): Promise<{ gameId: string; playerId: string }> {
    const gamesRef = ref(this.database, 'games');
    const newGameRef = push(gamesRef);
    const gameId = newGameRef.key!;
    const pId = playerId || this.generatePlayerId();

    const gameData = {
      metadata: {
        createdAt: serverTimestamp(),
        initialTimeElapsed: initialTimeElapsed || 0,
        createdBy: pId,
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
      players: {},
    };

    await set(newGameRef, gameData);

    // Add to user's games list
    await set(ref(this.database, `userGames/${playerId}/${gameId}`), true);

    this.deleteAllOldGames();

    return { gameId, playerId: pId };
  }

  async joinGame(gameId: string, playerName: string, playerId?: string) {
    const pId = playerId || this.generatePlayerId();
    if (!playerId) {
      console.warn('No playerId provided, generating a new one');
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_PLAYER_ID, pId);
    }
    const storedName = localStorage.getItem(
      LOCAL_STORAGE_KEYS.CURRENT_PLAYER_NAME,
    );
    if (!storedName) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_PLAYER_NAME, playerName);
    }

    try {
      // Check if game exists and is active
      const gameSnapshot = await this.getGameSnapshot(gameId);
      if (!gameSnapshot) {
        throw new Error('Game not found or inactive');
      }

      if (gameId === this.gameId()) {
        return gameSnapshot;
      }

      this.difficulty.set(gameSnapshot.difficulty);
      this.playerId.set(pId);
      this.playerName.set(playerName);
      this.gameId.set(gameId);
      this.joinedAt.set(Date.now());
      this.initialTimeElapsed.set(gameSnapshot.initialTimeElapsed || 0);
      this.createdAt.set(gameSnapshot.createdAt || null);

      // Check if player is already in the game
      const playerSnapshot = await new Promise<{ isActive: boolean }>(
        (resolve) => {
          onValue(
            ref(this.database, `games/${gameId}/players/${pId}`),
            (snapshot) => {
              resolve(snapshot.val());
            },
            { onlyOnce: true },
          );
        },
      );

      if (playerSnapshot?.isActive) {
        return gameSnapshot;
      }

      // Add player to game
      await set(ref(this.database, `games/${gameId}/players/${pId}`), {
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
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      });

      // Add to user's games list
      await set(ref(this.database, `userGames/${playerId}/${gameId}`), true);

      return gameSnapshot;
    } catch (error) {
      console.error('Failed to join game:', error);
      return false;
    }
  }

  async leaveGame(): Promise<void> {
    const gameId = this.gameId();
    const playerId = this.playerId();
    const playerName = this.playerName();
    if (!gameId || !playerId || !playerName) {
      console.warn('Not connected to a game');
      return;
    }

    // Remove player from game
    set(ref(this.database, `games/${gameId}/players/${playerId}`), {
      isActive: false,
      lastSeen: serverTimestamp(),
    });

    // Add leave event
    this.addGameEvent(gameId, {
      type: 'playerLeave',
      playerId,
      playerName,
      timestamp: Date.now(),
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    });
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
    lastActivity: number;
    completedAt?: number | null;
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

  async quickPencil(): Promise<void> {
    const gameId = this.gameId();
    const playerId = this.playerId();
    const playerName = this.playerName();
    if (!gameId || !playerId || !playerName) {
      throw new Error('Not connected to a game');
    }
    await this.addGameEvent(gameId, {
      type: 'quickPencil',
      playerId,
      playerName,
      timestamp: Date.now(),
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    });
    await this.updateLastActivity(gameId);
  }

  async logPuzzleEvent(event: PuzzleEvent): Promise<void> {
    const timestamp = Date.now();
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
      timestamp,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      ...event,
    });
  }

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

  async updatePlayerName(newName: string): Promise<void> {
    const gameId = this.gameId();
    const playerId = this.playerId();
    const oldName = this.playerName();
    if (!gameId || !playerId || !oldName) {
      throw new Error('Not connected to a game');
    }
    if (newName === oldName) {
      return;
    }

    // Update name in players list
    const playerNameRef = ref(
      this.database,
      `games/${gameId}/players/${playerId}/name`,
    );
    await set(playerNameRef, newName);

    // Log name change event
    await this.addGameEvent(gameId, {
      type: 'playerNameChange',
      playerId,
      playerName: newName,
      timestamp: Date.now(),
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      oldName,
      newName,
    });

    this.playerName.set(newName);
  }

  async completePuzzle(): Promise<void> {
    const gameId = this.gameId();
    const playerId = this.playerId();
    const playerName = this.playerName();
    if (!gameId || !playerId || !playerName) {
      throw new Error('Not connected to a game');
    }

    // Update completedAt in game state
    const completedAtRef = ref(
      this.database,
      `games/${gameId}/metadata/completedAt`,
    );
    await set(completedAtRef, serverTimestamp());

    this.addGameEvent(gameId, {
      type: 'puzzleComplete',
      playerId,
      playerName,
      timestamp: Date.now(),
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    });
    await this.updateLastActivity(gameId);
  }

  subscribeToChat(gameId: string) {
    const chatRef = ref(this.database, `games/${gameId}/chat`);
    return stateChanges(chatRef);
  }

  subscribeToGameEvents(gameId: string) {
    const eventsRef = ref(this.database, `games/${gameId}/events`);
    return stateChanges(eventsRef);
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

  private deleteAllOldGames() {
    const gamesRef = ref(this.database, 'games');
    // Use orderByChild to query only games with old lastActivity timestamps
    const cutoffTime = Date.now() - 48 * 60 * 60 * 1000; // 48 hours ago
    const oldGamesQuery = query(
      gamesRef,
      orderByChild('metadata/lastActivity'),
      endAt(cutoffTime),
    );

    const inactiveGamesQuery = query(
      gamesRef,
      orderByChild('metadata/isActive'),
      equalTo(false),
    );

    // Handle stale games
    onValue(
      oldGamesQuery,
      async (snapshot) => {
        const games = snapshot.val();
        if (!games) return;

        const deletePromises = Object.keys(games).map((gameId) =>
          set(ref(this.database, `games/${gameId}`), null),
        );

        await Promise.all(deletePromises);
      },
      { onlyOnce: true },
    );

    // Handle inactive games
    onValue(
      inactiveGamesQuery,
      async (snapshot) => {
        const games = snapshot.val();
        if (!games) return;

        const deletePromises = Object.keys(games).map((gameId) =>
          set(ref(this.database, `games/${gameId}`), null),
        );

        await Promise.all(deletePromises);
      },
      { onlyOnce: true },
    );
  }
}
