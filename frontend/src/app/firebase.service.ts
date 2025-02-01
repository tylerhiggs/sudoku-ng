import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  Firestore,
  limit,
  orderBy,
  query,
  where,
} from '@angular/fire/firestore';
import { firstValueFrom, Observable } from 'rxjs';
import { IndexedDbCompletedService } from './indexed-db-completed.service';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type SudokuEntryFirebase = {
  puzzle: number[];
  solution: number[];
  hash: string;
};

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  readonly firestore = inject(Firestore);
  readonly IndexedDbCompletedService = inject(IndexedDbCompletedService);

  public async getRandomPuzzle(difficulty: Difficulty) {
    const puzzlesStarted = await this.IndexedDbCompletedService.getAllHashes();
    console.log('puzzlesStarted', puzzlesStarted);
    const collectionRef = collection(this.firestore, difficulty);
    const queryRef = query(
      collectionRef,
      where('hash', 'not-in', puzzlesStarted.length ? puzzlesStarted : ['0']),
      orderBy('hash'),
      limit(1),
    );
    try {
      const snapshot = await firstValueFrom(
        collectionData(queryRef) as Observable<SudokuEntryFirebase[]>,
      );
      if (snapshot.length === 0) {
        console.error('No puzzles found');
        return null;
      }
      return {
        ...snapshot[0],
        puzzle: snapshot[0].puzzle.reduce((acc, n, i) => {
          if (i % 9 === 0) {
            acc.push([]);
          }
          acc[acc.length - 1].push(n);
          return acc;
        }, [] as number[][]),
        solution: snapshot[0].solution.reduce((acc, n, i) => {
          if (i % 9 === 0) {
            acc.push([]);
          }
          acc[acc.length - 1].push(n);
          return acc;
        }, [] as number[][]),
      };
    } catch (error) {
      console.error(error);
    }
    return null;
  }
}
