import { Component, effect, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChangeDetectionStrategy } from '@angular/core';
import { SudokuTableComponent } from './sudoku-table/sudoku-table.component';
import { Difficulty, FirebaseService } from './firebase.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SudokuTableComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly puzzle = signal<number[][] | null>(null);
  readonly solved = signal<number[][] | null>(null);
  readonly table = signal<number[][] | null>(null);
  readonly noteTable = signal<boolean[][][]>(
    Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => Array(9).fill(false)),
    ),
  );
  readonly loading = signal<boolean>(false);
  constructor(private firebaseService: FirebaseService) {
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
      console.log('Table', this.table());
    }
    const localNoteTable = localStorage.getItem('currentNoteTable');
    if (localNoteTable) {
      this.noteTable.set(JSON.parse(localNoteTable));
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
      console.log('Table', this.table());
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
  }

  readonly openPuzzle = async (difficulty: Difficulty) => {
    this.loading.set(true);
    const puzzle = await this.firebaseService.getRandomPuzzle(difficulty);
    if (puzzle) {
      this.puzzle.set(puzzle.puzzle);
      this.solved.set(puzzle.solution);
      this.table.set(puzzle.puzzle);
      console.log('Puzzle', puzzle);
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
}
