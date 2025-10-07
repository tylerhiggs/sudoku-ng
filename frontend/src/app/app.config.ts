import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getDatabase, provideDatabase } from '@angular/fire/database';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideZonelessChangeDetection(),
    provideFirebaseApp(() =>
      initializeApp({
        projectId: 'sudoku-6fbd2',
        appId: '1:659641408003:web:9b0e763115986958dd0c36',
        storageBucket: 'sudoku-6fbd2.firebasestorage.app',
        apiKey: 'AIzaSyDBHbi0TcZDoDQYSF9MMJ4nLDyKK3F-BZ4',
        authDomain: 'sudoku-6fbd2.firebaseapp.com',
        messagingSenderId: '659641408003',
        measurementId: 'G-S5ZV5RSP9J',
        databaseURL: 'https://sudoku-6fbd2-default-rtdb.firebaseio.com',
      }),
    ),
    provideFirestore(() => getFirestore()),
    provideDatabase(() => getDatabase()),
  ],
};
