import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  Firestore,
  limit,
  query,
  where,
} from '@angular/fire/firestore';
import { firstValueFrom, Observable } from 'rxjs';
export type Difficulty = 'easy' | 'medium' | 'hard';

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

  public async getRandomPuzzle(difficulty: Difficulty) {
    const puzzlesStarted: string[] = []; // TODO: get from indexed db
    const collectionRef = collection(this.firestore, difficulty);
    const queryRef = query(
      collectionRef,
      where('hash', '>=', '0'),
      where('hash', 'not-in', puzzlesStarted),
      limit(1),
    );
    try {
      const snapshot = await firstValueFrom(
        collectionData(queryRef) as Observable<SudokuEntryFirebase[]>,
      );
      if (snapshot.length === 0) {
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
