import { Routes } from '@angular/router';
import { HomeComponent } from '@pages/home/home.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'current-puzzle',
    loadComponent: () =>
      import('@pages/current-puzzle/current-puzzle.component').then(
        (m) => m.CurrentPuzzleComponent,
      ),
  },
  {
    path: 'collaborate/:gameId',
    loadComponent: () =>
      import('@pages/collaborate/collaborate.component').then(
        (m) => m.CollaborateComponent,
      ),
  },
];
