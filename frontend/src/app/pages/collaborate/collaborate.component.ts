import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  OnDestroy,
  signal,
} from '@angular/core';

import { LOCAL_STORAGE_KEYS } from '@/../constants';
import { PuzzleNavComponent } from '@components/puzzle-nav/puzzle-nav.component';
import { VictoryDialogComponent } from '@components/victory-dialog/victory-dialog.component';
import { SudokuTableComponent } from '@components/sudoku-table/sudoku-table.component';
import { JsonPipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  type ChatMessage,
  CollaborationService,
  type GameEvent,
} from '@services/collaboration/collaboration.service';
import { ChatComponent } from '@components/chat/chat.component';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-collaborate',
  imports: [
    PuzzleNavComponent,
    VictoryDialogComponent,
    SudokuTableComponent,
    JsonPipe,
    ChatComponent,
  ],
  templateUrl: './collaborate.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollaborateComponent implements OnDestroy {
  readonly gameId = input<string>();
  readonly loading = model<boolean>(false);

  private readonly collaborationService = inject(CollaborationService);
  private readonly router = inject(Router);

  private eventSubscription: Subscription | null = null;
  private chatSubscription: Subscription | null = null;

  readonly originalPuzzle = signal<number[][] | null>(null);
  readonly solved = signal<number[][] | null>(null);
  readonly table = signal<number[][] | null>(null);
  readonly hash = signal<number | null>(null);
  readonly noteTable = signal<boolean[][][]>(
    Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => Array(9).fill(false)),
    ),
  );

  readonly timeElapsed = signal(0);
  readonly timerInterval = signal<NodeJS.Timeout | null>(null);

  readonly victoryDialogClosed = signal<boolean>(false);
  readonly isVictoryDialogOpen = computed(() => {
    return !this.victoryDialogClosed() && this.isSolved() && !this.loading();
  });

  constructor() {
    effect(() => {
      const gameId = this.gameId();
      if (!gameId) {
        return;
      }
      this.collaborationService
        .joinGame(
          gameId,
          localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_PLAYER_NAME) ||
            'Anonymous',
          localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_PLAYER_ID) ||
            undefined,
        )
        .then((metadata) => {
          if (!metadata) {
            this.router.navigate(['/']);
            return;
          }
          this.hash.set(metadata.hash);
          this.originalPuzzle.set(metadata.originalPuzzle);
          this.table.set(metadata.currentTable);
          this.noteTable.set(metadata.noteTable);
          this.solved.set(metadata.solution);
          this.loading.set(false);
          this.timeElapsed.set(
            (metadata.initialTimeElapsed || 0) +
              Math.floor((Date.now() - metadata.createdAt) / 1000),
          );
          this.startTimer();
        })
        .then(() => {
          this.eventSubscription = this.collaborationService
            .subscribeToGameEvents(gameId)
            .subscribe((gameEvent) => {
              const val = gameEvent.snapshot.val() as GameEvent;
              this.gameEvents.update((events) => {
                const newEvents = [...events, val];
                return newEvents;
              });
              const joinedAt = this.collaborationService.joinedAt();
              if (
                (val.playerId === this.collaborationService.playerId() &&
                  joinedAt &&
                  val.timestamp > joinedAt) ||
                (val.type !== 'cellUpdate' && val.type !== 'quickPencil')
              ) {
                return;
              }
              if (val.type === 'quickPencil') {
                console.log('Applying quick pencil event', val);
                this.quickPencil(false);
                return;
              }
              if (val.note) {
                console.log('Applying note event', val);
                this.toggleNoteTable(
                  {
                    r: val.r,
                    c: val.c,
                    value: val.value,
                  },
                  false,
                );
              } else {
                console.log('Applying cell update event', val);
                this.updateTable(
                  { r: val.r, c: val.c, value: val.value },
                  false,
                );
              }
            });
          this.chatSubscription = this.collaborationService
            .subscribeToChat(gameId)
            .subscribe((chatEvent) => {
              const joinedAt = this.collaborationService.joinedAt();
              const val = chatEvent.snapshot.val() as ChatMessage;
              if (
                val.playerId === this.collaborationService.playerId() &&
                joinedAt &&
                val.timestamp > joinedAt
              ) {
                return;
              }
              this.chatMessages.update((messages) => {
                const newMessages = [...messages, val];
                return newMessages;
              });
            });
        });
    });

    effect(() => {
      if (!this.isSolved()) {
        return;
      }
      this.stopTimer();
    });
  }

  readonly gameEvents = signal<GameEvent[]>([]);
  readonly chatMessages = signal<ChatMessage[]>([]);

  readonly updateTable = (
    {
      r,
      c,
      value,
    }: {
      r: number;
      c: number;
      value: number;
    },
    updateDb = true,
  ) => {
    this.table.update((t) => {
      if (!t) {
        return t;
      }
      t[r][c] = value;
      return [...t];
    });
    if (!updateDb) return;
    this.collaborationService.logPuzzleEvent({ r, c, value });
  };

  readonly toggleNoteTable = (
    {
      r,
      c,
      value,
    }: {
      r: number;
      c: number;
      value: number;
    },
    updateDb = true,
  ) => {
    this.noteTable.update((t) => {
      if (!t) {
        return t;
      }
      t[r][c][value] = !t[r][c][value];
      return [...t];
    });
    if (!updateDb) return;
    this.collaborationService.logPuzzleEvent({ r, c, value, note: true });
  };

  readonly isSolved = computed(() => {
    const table = this.table();
    const solved = this.solved();
    if (!table || !solved) {
      return false;
    }
    return table.every((r, i) => r.every((c, j) => c === solved[i][j]));
  });

  readonly reset = () => {
    this.router.navigate(['/']);
  };

  readonly quickPencil = (updateDb = true) => {
    this.noteTable.update((t) =>
      t.map((r) => r.map((notes) => notes.map(() => true))),
    );
    if (updateDb) {
      this.collaborationService.quickPencil();
    }
  };
  readonly sendMessage = (message: string) => {
    this.collaborationService.sendChatMessage(message);
    this.chatMessages.update((messages) => {
      const newMessages = [
        ...messages,
        {
          playerId: this.collaborationService.playerId() || 'unknown',
          playerName: this.collaborationService.playerName() || 'Unknown',
          message,
          timestamp: Date.now(),
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        },
      ];
      return newMessages;
    });
  };
  private startTimer() {
    this.timerInterval.set(
      setInterval(() => {
        this.timeElapsed.update((time) => time + 1);
      }, 1000),
    );
  }

  private stopTimer() {
    const timerInterval = this.timerInterval();
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
    if (this.eventSubscription) {
      this.eventSubscription.unsubscribe();
    }
    // this.collaborationService.leaveGame();
  }
}
