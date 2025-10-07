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
import type { PuzzleEvent } from 'types';
import { PuzzleNavComponent } from '@components/puzzle-nav/puzzle-nav.component';
import { VictoryDialogComponent } from '@components/victory-dialog/victory-dialog.component';
import { SudokuTableComponent } from '@components/sudoku-table/sudoku-table.component';
import { JsonPipe } from '@angular/common';
import { Router } from '@angular/router';
import { CollaborationService } from '@services/collaboration/collaboration.service';
@Component({
  selector: 'app-collaborate',
  imports: [
    PuzzleNavComponent,
    VictoryDialogComponent,
    SudokuTableComponent,
    JsonPipe,
  ],
  templateUrl: './collaborate.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollaborateComponent implements OnDestroy {
  readonly gameId = input.required<string>();
  readonly loading = model<boolean>(false);

  private readonly collaborationService = inject(CollaborationService);
  private readonly router = inject(Router);

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
      this.collaborationService
        .joinGame(
          this.gameId(),
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
              Date.now() -
              metadata.createdAt,
          );
          this.startTimer();
        });
    });

    effect(() => {
      if (!this.isSolved()) {
        return;
      }
      this.stopTimer();
    });
  }

  readonly handlePuzzleEvent = (event: PuzzleEvent) => {
    this.collaborationService.logPuzzleEvent(event);
  };

  readonly updateTable = ({
    r,
    c,
    value,
  }: {
    r: number;
    c: number;
    value: number;
  }) => {
    this.table.update((t) => {
      if (!t) {
        return t;
      }
      t[r][c] = value;
      return [...t];
    });
  };

  readonly toggleNoteTable = ({
    r,
    c,
    value,
  }: {
    r: number;
    c: number;
    value: number;
  }) => {
    this.noteTable.update((t) => {
      if (!t) {
        return t;
      }
      t[r][c][value] = !t[r][c][value];
      return [...t];
    });
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

  readonly quickPencil = () => {
    this.noteTable.update((t) =>
      t.map((r) => r.map((notes) => notes.map(() => true))),
    );
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
    // this.collaborationService.leaveGame();
  }
}
