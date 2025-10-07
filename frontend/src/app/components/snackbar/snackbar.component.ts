import { Component, inject } from '@angular/core';
import { SnackbarStore } from '@stores/snackbar.store';

@Component({
  selector: 'app-snackbar',
  imports: [],
  templateUrl: './snackbar.component.html',
  styleUrl: './snackbar.component.css',
})
export class SnackbarComponent {
  readonly snackbarStore = inject(SnackbarStore);
}
