import { Component, effect, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChangeDetectionStrategy } from '@angular/core';
import { SudokuTableComponent } from './sudoku-table/sudoku-table.component';
import { Difficulty, FirebaseService } from './firebase.service';
import { VictoryDialogComponent } from './victory-dialog/victory-dialog.component';
import { IndexedDbCompletedService } from './indexed-db-completed.service';
import { PuzzleNavComponent } from './puzzle-nav/puzzle-nav.component';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    SudokuTableComponent,
    VictoryDialogComponent,
    PuzzleNavComponent,
    ConfirmationDialogComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly puzzle = signal<number[][] | null>(null);
  readonly solved = signal<number[][] | null>(null);
  readonly table = signal<number[][] | null>(null);
  readonly hash = signal<number | null>(null);
  readonly noteTable = signal<boolean[][][]>(
    Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => Array(9).fill(false)),
    ),
  );
  readonly loading = signal<boolean>(false);
  readonly victoryDialogOpen = signal<boolean>(true);
  readonly confirmationDialogOpen = signal<boolean>(false);
  readonly confirmationTitle = signal<string>('Are you sure?');
  readonly confirmationMessage = signal<string>(
    'You will lose all progress on the current puzzle.',
  );
  readonly pendingDifficulty = signal<Difficulty | null>(null);
  constructor(
    private firebaseService: FirebaseService,
    private indexedDbService: IndexedDbCompletedService,
  ) {
    const localPuzzle = localStorage.getItem('currentPuzzle');
    if (localPuzzle) {
      this.puzzle.set(JSON.parse(localPuzzle));
    }
    const localSolved = localStorage.getItem('currentSolved');
    if (localSolved) {
      this.solved.set(JSON.parse(localSolved));
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

    effect(() => {
      if (!this.puzzle()) {
        return;
      }
      localStorage.setItem('currentPuzzle', JSON.stringify(this.puzzle()));
    });

    effect(() => {
      if (!this.solved()) {
        return;
      }
      localStorage.setItem('currentSolved', JSON.stringify(this.solved()));
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
      if (!this.hash()) {
        return;
      }
      localStorage.setItem('currentHash', JSON.stringify(this.hash()));
    });

    effect(() => {
      console.log('am I even here?', this.hash(), this.isSolved());
      const hash = this.hash();
      if (this.isSolved() && hash) {
        try {
          console.log('adding row', hash);
          this.indexedDbService.addRow(hash);
        } catch (error) {
          console.error(error);
        }
      }
    });
  }

  readonly openPuzzle = async (difficulty: Difficulty, force = false) => {
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
        this.pendingDifficulty.set(difficulty);
        return;
      }
    }
    this.loading.set(true);
    const puzzle = await this.firebaseService.getRandomPuzzle(difficulty);
    if (puzzle) {
      this.puzzle.set([...puzzle.puzzle]);
      this.solved.set(puzzle.solution);
      this.table.set([...puzzle.puzzle]);
      this.hash.set(parseInt(puzzle.hash));
    }
    setTimeout(() => {
      this.loading.set(false);
    }, 0);
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

  readonly isSolved = () => {
    const table = this.table();
    const solved = this.solved();
    if (!table || !solved) {
      return false;
    }
    return table.every((r, i) => r.every((c, j) => c === solved[i][j]));
  };

  readonly reset = (removeFromLocal: boolean = true) => {
    this.table.set(null);
    this.noteTable.set(
      Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => Array(9).fill(false)),
      ),
    );
    this.hash.set(null);
    this.solved.set(null);
    this.puzzle.set(null);
    this.victoryDialogOpen.set(false);
    if (!removeFromLocal) return;
    localStorage.removeItem('currentPuzzle');
    localStorage.removeItem('currentSolved');
    localStorage.removeItem('currentTable');
    localStorage.removeItem('currentNoteTable');
    localStorage.removeItem('currentHash');
  };

  readonly testSolve = async () => {
    const hash = this.hash();
    if (hash) {
      try {
        await this.indexedDbService.addRow(hash);
      } catch (error) {
        console.error(error);
      }
    }
    this.reset();
  };

  readonly confirmReset = () => {
    this.reset(false);
    const difficulty = this.pendingDifficulty();
    if (!difficulty) return;
    this.openPuzzle(difficulty, true);
    this.confirmationDialogOpen.set(false);
  };
}
