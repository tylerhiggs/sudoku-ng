import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FirebaseService } from '@services/firebase.service';
import { LOCAL_STORAGE_KEYS } from '@/../constants';
import type { Difficulty } from 'types';
import { PuzzleNavComponent } from '@components/puzzle-nav/puzzle-nav.component';
import { VictoryDialogComponent } from '@components/victory-dialog/victory-dialog.component';
import { SudokuTableComponent } from '@components/sudoku-table/sudoku-table.component';
import { JsonPipe } from '@angular/common';
import { Router } from '@angular/router';
import { CollaborationService } from '@services/collaboration/collaboration.service';
import { generateName } from '@utils/name-generator';

@Component({
  selector: 'app-current-puzzle',
  imports: [
    PuzzleNavComponent,
    VictoryDialogComponent,
    SudokuTableComponent,
    JsonPipe,
  ],
  templateUrl: './current-puzzle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrentPuzzleComponent {
  private readonly firebaseService = inject(FirebaseService);
  private readonly router = inject(Router);
  private readonly collaborationService = inject(CollaborationService);

  readonly originalPuzzle = signal<number[][] | null>(null);
  readonly solved = signal<number[][] | null>(null);
  readonly table = signal<number[][] | null>(null);
  readonly hash = signal<number | null>(null);
  readonly noteTable = signal<boolean[][][]>(
    Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => Array(9).fill(false)),
    ),
  );

  readonly difficulty = localStorage.getItem(
    LOCAL_STORAGE_KEYS.CURRENT_DIFFICULTY,
  ) as Difficulty;

  readonly timeElapsed = signal(0);
  readonly timerInterval = signal<NodeJS.Timeout | null>(null);

  readonly loading = signal<boolean>(false);
  readonly victoryDialogClosed = signal<boolean>(false);
  readonly isVictoryDialogOpen = computed(() => {
    return !this.victoryDialogClosed() && this.isSolved() && !this.loading();
  });

  constructor() {
    const localPuzzle = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_PUZZLE);
    if (localPuzzle) {
      this.originalPuzzle.set(JSON.parse(localPuzzle));
    }
    const localSolved = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_SOLVED);
    if (localSolved) {
      this.solved.set(JSON.parse(localSolved));
    }
    const localTable = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_TABLE);
    if (localTable) {
      this.table.set(JSON.parse(localTable));
    }
    const localNoteTable = localStorage.getItem(
      LOCAL_STORAGE_KEYS.CURRENT_NOTE_TABLE,
    );
    if (localNoteTable) {
      this.noteTable.set(JSON.parse(localNoteTable));
    }
    const localHash = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_HASH);
    if (localHash) {
      this.hash.set(JSON.parse(localHash));
    }
    const localTime = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_TIME);
    if (localTime) {
      this.timeElapsed.set(JSON.parse(localTime));
      this.startTimer();
    }

    effect(() => {
      if (!this.originalPuzzle()) {
        return;
      }
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.CURRENT_PUZZLE,
        JSON.stringify(this.originalPuzzle()),
      );
    });

    effect(() => {
      if (!this.solved()) {
        return;
      }
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.CURRENT_SOLVED,
        JSON.stringify(this.solved()),
      );
    });

    effect(() => {
      if (!this.table()) {
        return;
      }
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.CURRENT_TABLE,
        JSON.stringify(this.table()),
      );
    });

    effect(() => {
      if (!this.noteTable()) {
        return;
      }
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.CURRENT_NOTE_TABLE,
        JSON.stringify(this.noteTable()),
      );
    });

    effect(() => {
      if (!this.hash()) {
        return;
      }
      localStorage.setItem('currentHash', JSON.stringify(this.hash()));
    });

    effect(() => {
      const hash = this.hash();
      const time = this.timeElapsed();
      const difficulty = localStorage.getItem(
        LOCAL_STORAGE_KEYS.CURRENT_DIFFICULTY,
      ) as Difficulty;
      if (this.isSolved() && hash && time && difficulty) {
        this.stopTimer();
        try {
          this.firebaseService.completePuzzle(hash, time, difficulty);
        } catch (error) {
          console.error('Unable to mark puzzle as complete:');
          console.error(error);
        }
      }
    });

    effect(() => {
      const time = this.timeElapsed();
      if (!time) return;
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.CURRENT_TIME,
        JSON.stringify(time),
      );
    });
  }

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

  readonly reset = (removeFromLocal = true) => {
    this.stopTimer();
    if (removeFromLocal) {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_PUZZLE);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_SOLVED);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_TABLE);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_NOTE_TABLE);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_HASH);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_TIME);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_DIFFICULTY);
    }
    this.router.navigate(['/']);
  };

  readonly quickPencil = () => {
    this.noteTable.update((t) =>
      t.map((r) => r.map((notes) => notes.map(() => true))),
    );
  };

  readonly startCollaboration = () => {
    console.log('Starting collaboration');
    const originalPuzzle = this.originalPuzzle();
    const solution = this.solved();
    const currentTable = this.table();
    const noteTable = this.noteTable();
    const hash = this.hash();
    const difficulty = localStorage.getItem(
      LOCAL_STORAGE_KEYS.CURRENT_DIFFICULTY,
    ) as Difficulty;
    const playerName =
      localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_PLAYER_NAME) ||
      generateName();
    const playerId = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_PLAYER_ID);
    if (
      !originalPuzzle ||
      !solution ||
      !currentTable ||
      !noteTable ||
      !difficulty ||
      !hash
    ) {
      console.error('Missing data for collaboration');
      return;
    }
    this.loading.set(true);
    this.collaborationService
      .createGame(
        originalPuzzle,
        solution,
        currentTable,
        noteTable,
        difficulty,
        hash,
        playerId || undefined,
        this.timeElapsed(),
      )
      .then(({ gameId, playerId }) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_PLAYER_ID, playerId);
        localStorage.setItem(
          LOCAL_STORAGE_KEYS.CURRENT_PLAYER_NAME,
          playerName,
        );
        this.loading.set(false);
        console.log('Navigating to collaboration game:', gameId);
        this.router.navigate(['/collaborate', gameId]);
      });
  };
}
