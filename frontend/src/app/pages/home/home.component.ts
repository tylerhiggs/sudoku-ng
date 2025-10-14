import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FirebaseService } from '@services/firebase.service';
import { LOCAL_STORAGE_KEYS } from '@/../constants';
import type { Difficulty } from 'types';
import { ConfirmationDialogComponent } from '@components/confirmation-dialog/confirmation-dialog.component';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [ConfirmationDialogComponent, RouterLink],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  ngOnInit(): void {
    try {
      this.loading.set(true);
      this.firebaseService.tryPopulateLocalUnsolvedStore().then(() => {
        this.loading.set(false);
      });
    } catch (error) {
      console.error(error);
    }
    this.currentPuzzleExists.set(
      !!localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_PUZZLE),
    );
  }

  constructor() {
    effect(() => {
      const d = this.pendingDifficulty();
      if (!d) {
        return;
      }
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_DIFFICULTY, d);
    });
  }

  private readonly firebaseService = inject(FirebaseService);
  private readonly router = inject(Router);

  readonly currentPuzzleExists = signal(false);
  readonly pendingDifficulty = signal<Difficulty | null>(null);
  readonly confirmationDialogOpen = signal(false);
  readonly loading = signal(true);

  readonly openPuzzle = async (difficulty: Difficulty, force = false) => {
    this.pendingDifficulty.set(difficulty);
    if (!force) {
      const localTable: number[][] = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_TABLE) || 'null',
      );
      const localPuzzle: number[][] = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_PUZZLE) || 'null',
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
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.CURRENT_PUZZLE,
        JSON.stringify([...puzzle.puzzle.map((r) => [...r])]),
      );
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.CURRENT_SOLVED,
        JSON.stringify([...puzzle.solution]),
      );
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.CURRENT_TABLE,
        JSON.stringify([...puzzle.puzzle.map((r) => [...r])]),
      );
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.CURRENT_HASH,
        JSON.stringify(parseInt(puzzle.hash)),
      );
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_TIME, JSON.stringify(0));
    }
    this.router.navigate(['/current-puzzle']);
  };

  readonly confirmReset = () => {
    const difficulty = this.pendingDifficulty();
    if (!difficulty) return;
    this.openPuzzle(difficulty, true);
    this.confirmationDialogOpen.set(false);
  };
}
