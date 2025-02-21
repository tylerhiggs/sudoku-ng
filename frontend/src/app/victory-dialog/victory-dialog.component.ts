import { Component, effect, input, output, viewChild } from '@angular/core';
import { FirebaseService } from '../firebase.service';

@Component({
  selector: 'app-victory-dialog',
  imports: [],
  templateUrl: './victory-dialog.component.html',
})
export class VictoryDialogComponent {
  readonly open = input<boolean>();
  readonly onClose = output<void>();
  readonly onRestart = output<void>();
}
