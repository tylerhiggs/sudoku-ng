import { Component, signal } from '@angular/core';
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
  readonly loading = signal<boolean>(false);
  constructor(private firebaseService: FirebaseService) {}

  readonly openPuzzle = async (difficulty: Difficulty) => {
    this.loading.set(true);
    const puzzle = await this.firebaseService.getRandomPuzzle(difficulty);
    if (puzzle) {
      this.puzzle.set(puzzle.puzzle);
      this.solved.set(puzzle.solution);
      console.log('Puzzle', puzzle);
    }
    setTimeout(() => {
      this.loading.set(false);
    }, 0);
  };
}
