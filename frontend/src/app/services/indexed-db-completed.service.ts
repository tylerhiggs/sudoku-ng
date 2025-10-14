import { Injectable } from '@angular/core';
import { Difficulty, SudokuEntryIndexedDb } from '@/../types';

@Injectable({
  providedIn: 'root',
})
export class IndexedDbCompletedService {
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
        resolve();
      };

      request.onerror = (event: Event) => {
        console.error('error deleting from local unsolved', hash);
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
    try {
      await this.removeUnsolved(hash, difficulty);
    } catch (error) {
      console.error(
        'Failed to remove unsolved puzzle:',
        error,
        'with difficulty',
        difficulty,
      );
    }

    try {
      await this.addRowSolved(hash, time);
    } catch (error) {
      console.error('Failed to add solved puzzle to table, skipping:', error);
    }
  }

  async getUnsolvedCount(difficulty: Difficulty): Promise<number> {
    const storeName = `${this.unsolvedStorePrefix}-${difficulty}`;
    const db = await this.openDb();

    return new Promise((resolve) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };

      request.onerror = (event) => {
        console.error((event.target as IDBRequest).error);
        resolve(0);
      };
    });
  }

  async getRandomUnsolved(
    difficulty: Difficulty,
  ): Promise<SudokuEntryIndexedDb> {
    const storeName = `${this.unsolvedStorePrefix}-${difficulty}`;

    const db = await this.openDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();
      request.onsuccess = (event: Event) => {
        const cursor = (event.target as IDBRequest).result;
        if (!cursor) {
          console.error('No unsolved puzzles', 'cursor', cursor);
          reject(new Error('No unsolved puzzles'));
        }
        resolve(cursor.value);
      };

      request.onerror = (event) => {
        const err = (event.target as IDBRequest).error;
        console.error(err);
        reject(err);
      };
    });
  }
}
