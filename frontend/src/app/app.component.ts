import { Component, computed, effect, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChangeDetectionStrategy } from '@angular/core';
import { SudokuTableComponent } from './sudoku-table/sudoku-table.component';
import { FirebaseService } from './firebase.service';
import { VictoryDialogComponent } from './victory-dialog/victory-dialog.component';
import { PuzzleNavComponent } from './puzzle-nav/puzzle-nav.component';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';
import { Difficulty } from '../types';
import { JsonPipe } from '@angular/common';
import { SnackbarComponent } from './snackbar/snackbar.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    SudokuTableComponent,
    VictoryDialogComponent,
    PuzzleNavComponent,
    ConfirmationDialogComponent,
    JsonPipe,
    SnackbarComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly originalPuzzle = signal<number[][] | null>(null);
  readonly solved = signal<number[][] | null>(null);
  readonly table = signal<number[][] | null>(null);
  readonly hash = signal<number | null>(null);
  readonly mainMenuOpen = signal<boolean>(true);
  readonly noteTable = signal<boolean[][][]>(
    Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => Array(9).fill(false)),
    ),
  );
  readonly timeElapsed = signal(0);
  readonly timerInterval = signal<NodeJS.Timeout | null>(null);
  readonly loading = signal<boolean>(false);
  readonly showVictoryDialog = signal<boolean>(true);
  readonly isVictoryDialogOpen = computed(() => {
    return this.showVictoryDialog() && this.isSolved() && !this.loading();
  });
  readonly confirmationDialogOpen = signal<boolean>(false);
  readonly confirmationTitle = signal<string>('Are you sure?');
  readonly confirmationMessage = signal<string>(
    'You will lose all progress on the current puzzle.',
  );
  readonly pendingDifficulty = signal<Difficulty | null>(null);

  constructor(private firebaseService: FirebaseService) {
    try {
      this.firebaseService.tryPopulateLocalUnsolvedStore();
    } catch (error) {
      console.error(error);
    }
    const localPuzzle = localStorage.getItem('currentPuzzle');
    if (localPuzzle) {
      this.originalPuzzle.set(JSON.parse(localPuzzle));
      console.log('puzzle', this.originalPuzzle());
    }
    const localSolved = localStorage.getItem('currentSolved');
    if (localSolved) {
      this.solved.set(JSON.parse(localSolved));
      console.log('solved', this.solved());
    }
    const localTable = localStorage.getItem('currentTable');
    if (localTable) {
      this.table.set(JSON.parse(localTable));
    }
    const localNoteTable = localStorage.getItem('currentNoteTable');
    if (localNoteTable) {
      this.noteTable.set(JSON.parse(localNoteTable));
    }
    const localHash = localStorage.getItem('currentHash');
    if (localHash) {
      this.hash.set(JSON.parse(localHash));
    }
    const localTime = localStorage.getItem('currentTime');
    if (localTime) {
      this.timeElapsed.set(JSON.parse(localTime));
      this.startTimer();
    }

    const localDifficulty = localStorage.getItem('currentDifficulty');
    if (localDifficulty) {
      this.pendingDifficulty.set(JSON.parse(localDifficulty));
    }

    if (localHash && localTable && localSolved && localPuzzle) {
      this.mainMenuOpen.set(false);
    }

    effect(() => {
      if (!this.originalPuzzle()) {
        return;
      }
      localStorage.setItem(
        'currentPuzzle',
        JSON.stringify(this.originalPuzzle()),
      );
      console.log('puzzle', this.originalPuzzle());
    });

    effect(() => {
      if (!this.solved()) {
        return;
      }
      localStorage.setItem('currentSolved', JSON.stringify(this.solved()));
      console.log('solved', this.solved());
    });

    effect(() => {
      if (!this.table()) {
        return;
      }
      localStorage.setItem('currentTable', JSON.stringify(this.table()));
    });

    effect(() => {
      if (!this.noteTable()) {
        return;
      }
      localStorage.setItem(
        'currentNoteTable',
        JSON.stringify(this.noteTable()),
      );
    });

    effect(() => {
      if (!this.pendingDifficulty()) {
        return;
      }
      localStorage.setItem(
        'currentDifficulty',
        JSON.stringify(this.pendingDifficulty()),
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
      const difficulty = this.pendingDifficulty();
      if (this.isSolved() && hash && time && difficulty) {
        this.stopTimer();
        try {
          this.firebaseService.completePuzzle(hash, time, difficulty);
        } catch (error) {
          console.error('caught error in app.component.ts');
          console.error(error);
        }
      }
    });

    effect(() => {
      const time = this.timeElapsed();
      if (!time) return;
      localStorage.setItem('currentTime', JSON.stringify(time));
    });
  }

  readonly openPuzzle = async (difficulty: Difficulty, force = false) => {
    this.pendingDifficulty.set(difficulty);
    this.stopTimer();
    this.timeElapsed.set(0);
    this.timerInterval.set(null);
    if (!force) {
      const localTable: number[][] = JSON.parse(
        localStorage.getItem('currentTable') || 'null',
      );
      const localPuzzle: number[][] = JSON.parse(
        localStorage.getItem('currentPuzzle') || 'null',
      );
      if (
        localTable &&
        localPuzzle &&
        !localTable.every((r, i) => r.every((c, j) => c === localPuzzle[i][j]))
      ) {
        this.confirmationDialogOpen.set(true);
        return;
      }
    }
    this.loading.set(true);
    const puzzle = await this.firebaseService.getRandomPuzzle(difficulty);
    if (puzzle) {
      this.originalPuzzle.set([...puzzle.puzzle.map((r) => [...r])]);
      this.solved.set([...puzzle.solution]);
      this.table.set([...puzzle.puzzle.map((r) => [...r])]);
      this.hash.set(parseInt(puzzle.hash));
      this.mainMenuOpen.set(false);
      this.startTimer();
    }
    this.loading.set(false);
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
    this.mainMenuOpen.set(true);
    this.showVictoryDialog.set(true);
    if (!removeFromLocal) return;
    this.table.set(null);
    this.noteTable.set(
      Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => Array(9).fill(false)),
      ),
    );
    this.hash.set(null);
    this.solved.set(null);
    this.originalPuzzle.set(null);
    this.stopTimer();
    this.timeElapsed.set(0);
    this.timerInterval.set(null);

    localStorage.removeItem('currentPuzzle');
    localStorage.removeItem('currentSolved');
    localStorage.removeItem('currentTable');
    localStorage.removeItem('currentNoteTable');
    localStorage.removeItem('currentHash');
    localStorage.removeItem('currentTime');
  };

  readonly confirmReset = () => {
    this.reset(false);
    const difficulty = this.pendingDifficulty();
    if (!difficulty) return;
    this.openPuzzle(difficulty, true);
    this.confirmationDialogOpen.set(false);
  };

  readonly quickPencil = () => {
    this.noteTable.update((t) =>
      t.map((r) => r.map((notes) => notes.map(() => true))),
    );
  };
}
