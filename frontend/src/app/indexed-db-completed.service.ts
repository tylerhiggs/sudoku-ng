import { Injectable } from '@angular/core';
import { Difficulty, SudokuEntryIndexedDb } from '../types';

@Injectable({
  providedIn: 'root',
})
export class IndexedDbCompletedService {
  constructor() {}
  private readonly dbName = 'SudokuDB';
  private readonly solvedStoreName = 'completed';
  private readonly unsolvedStorePrefix = 'unsolved';

  private readonly allStores = (
    ['easy', 'medium', 'hard', 'expert'] as Difficulty[]
  )
    .map((d) => `${this.unsolvedStorePrefix}-${d}`)
    .concat(this.solvedStoreName);

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 3);

      request.onupgradeneeded = (event: Event) => {
        const target = event.target as IDBOpenDBRequest | null;
        if (!target) {
          reject(new Error('Failed to open database'));
          return;
        }
        const db = target.result;
        this.allStores
          .filter((storeName) => !db.objectStoreNames.contains(storeName))
          .forEach((storeName) => {
            db.createObjectStore(storeName, { keyPath: 'hash' });
            console.log(`created db store: ${storeName}`);
          });
      };

      request.onsuccess = (event: Event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (event: Event) => {
        console.error('error inside openDb');
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  async addRowSolved(hash: number, time: number): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.solvedStoreName], 'readwrite');
      const store = transaction.objectStore(this.solvedStoreName);
      const request = store.add({
        hash,
        datetime: new Date().toISOString(),
        time,
      });

      request.onsuccess = () => {
        console.log('success');
        resolve();
      };

      request.onerror = (event: Event) => {
        console.error((event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  }

  /**
   * populates the "unsolved" indexed db store
   * @param rows
   * @param difficulty
   * @returns
   */
  async populateUnsolved(
    rows: SudokuEntryIndexedDb[],
    difficulty: Difficulty,
  ): Promise<number> {
    const storeName = `${this.unsolvedStorePrefix}-${difficulty}`;
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      let count = 0;
      rows.forEach((row) => {
        store.add(row);
        count++;
      });

      transaction.oncomplete = () => {
        resolve(count);
      };
      transaction.onerror = (event: Event) => {
        console.error((event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  }

  async removeUnsolved(hash: number, difficulty: Difficulty): Promise<void> {
    const storeName = `${this.unsolvedStorePrefix}-${difficulty}`;
    const db = await this.openDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(hash);

      request.onsuccess = () => {
        console.log('success');
        resolve();
      };

      request.onerror = (event: Event) => {
        console.error((event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  }

  public async puzzleCompleted(
    hash: number,
    time: number,
    difficulty: Difficulty,
  ): Promise<void> {
    await this.addRowSolved(hash, time);
    await this.removeUnsolved(hash, difficulty);
  }

  async getUnsolvedCount(difficulty: Difficulty): Promise<number> {
    const storeName = `${this.unsolvedStorePrefix}-${difficulty}`;
    const db = await this.openDb();

    return new Promise((resolve) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = (event: any) => {
        resolve(event.target.result);
      };

      request.onerror = (event: any) => {
        console.error(event.target.error);
        resolve(0);
      };
    });
  }

  async getRandomUnsolved(
    difficulty: Difficulty,
  ): Promise<SudokuEntryIndexedDb> {
    console.log('here');
    const storeName = `${this.unsolvedStorePrefix}-${difficulty}`;

    const db = await this.openDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();
      request.onsuccess = (event: Event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          console.log('found unsolved puzzle', cursor.value);
          resolve(cursor.value);
        }
        console.error('No unsolved puzzles');
        reject(new Error('No unsolved puzzles'));
      };

      request.onerror = (event: any) => {
        console.error(event.target.error);
        reject(event.target.error);
      };
    });
  }
}
