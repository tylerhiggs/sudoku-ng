import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  Firestore,
  limit,
  query,
} from '@angular/fire/firestore';
import { firstValueFrom, Observable } from 'rxjs';
import { IndexedDbCompletedService } from './indexed-db-completed.service';
import {
  Difficulty,
  SudokuEntryFirebase,
  SudokuEntryIndexedDb,
} from '@/../types';

const BATCH_SIZE = 50;

const MIN_PUZZLES: Record<Difficulty, number> = {
  easy: 50,
  medium: 50,
  hard: 50,
  expert: 50,
};

const puzzleCollectionName = 'puzzles';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  readonly firestore = inject(Firestore);
  readonly IndexedDbCompletedService = inject(IndexedDbCompletedService);

  readonly storePrefix = 'batches-';

  /**
   * Gets batch index stored in local storage which is the index
   * of the next batch of puzzles to get from firebase
   * @param difficulty
   * @returns
   */
  private getBatchIndex(difficulty: Difficulty) {
    const index =
      Number(localStorage.getItem(`${this.storePrefix}${difficulty}`)) || 0;

    localStorage.setItem(
      `${this.storePrefix}${difficulty}`,
      (index + 1).toString(),
    );
    return index;
  }

  public async getRandomPuzzle(
    difficulty: Difficulty,
  ): Promise<SudokuEntryIndexedDb> {
    return await this.IndexedDbCompletedService.getRandomUnsolved(difficulty);
  }

  public async completePuzzle(
    hash: number,
    time: number,
    difficulty: Difficulty,
  ) {
    await this.IndexedDbCompletedService.puzzleCompleted(
      hash,
      time,
      difficulty,
    );
    await this.tryPopulateLocalUnsolvedStore();
  }

  public async tryPopulateLocalUnsolvedStore() {
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
    difficulties.forEach(async (difficulty) => {
      let count = 0;
      try {
        count =
          await this.IndexedDbCompletedService.getUnsolvedCount(difficulty);
      } catch (error) {
        console.error(error);
      }
      if (count >= MIN_PUZZLES[difficulty]) return;
      const puzzles = await this.getNewPuzzles(difficulty);

      if (!puzzles) return;
      await this.IndexedDbCompletedService.populateUnsolved(
        puzzles,
        difficulty,
      );
    });
  }

  public async getNewPuzzles(difficulty: Difficulty) {
    const puzzles: SudokuEntryIndexedDb[] = [];
    const index = this.getBatchIndex(difficulty);
    const collectionRef = collection(
      this.firestore,
      this.storePrefix + difficulty,
      index.toString(),
      puzzleCollectionName,
    );
    const queryRef = query(collectionRef, limit(BATCH_SIZE));
    try {
      const snapshot = await firstValueFrom(
        collectionData(queryRef) as Observable<SudokuEntryFirebase[]>,
      );
      snapshot.forEach((entry) => {
        puzzles.push({
          ...this.transformToPuzzle(entry, difficulty),
          difficulty,
        });
      });
      return puzzles;
    } catch (error) {
      console.error(error);
    }
    return;
  }

  public transformToPuzzle(
    entry: SudokuEntryFirebase,
    difficulty: Difficulty,
  ): SudokuEntryIndexedDb {
    return {
      ...entry,
      difficulty,
      puzzle: entry.puzzle.reduce((acc, n, i) => {
        if (i % 9 === 0) {
          acc.push([]);
        }
        acc[acc.length - 1].push(n);
        return acc;
      }, [] as number[][]),
      solution: entry.solution.reduce((acc, n, i) => {
        if (i % 9 === 0) {
          acc.push([]);
        }
        acc[acc.length - 1].push(n);
        return acc;
      }, [] as number[][]),
    };
  }
}
