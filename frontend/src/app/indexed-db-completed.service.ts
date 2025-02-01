import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class IndexedDbCompletedService {
  constructor() {}
  private dbName = 'SudokuDB';
  private storeName = 'completed';

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'hash' });
        }
      };

      request.onsuccess = (event: any) => {
        resolve(event.target.result);
      };

      request.onerror = (event: any) => {
        reject(event.target.error);
      };
    });
  }

  async getAllHashes(): Promise<number[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = (event: any) => {
        const results = event.target.result;
        const hashes = results.map((item: any) => item.hash);
        console.log('hashes', hashes);
        resolve(hashes);
      };

      request.onerror = (event: any) => {
        console.error(event.target.error);
        reject(event.target.error);
      };
    });
  }

  async addRow(hash: number): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add({ hash, datetime: new Date().toISOString() });

      request.onsuccess = () => {
        console.log('success');
        resolve();
      };

      request.onerror = (event: any) => {
        console.error(event.target.error);
        reject(event.target.error);
      };
    });
  }
}
