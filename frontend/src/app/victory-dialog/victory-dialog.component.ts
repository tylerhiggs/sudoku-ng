import { Component, effect, input, output, viewChild } from '@angular/core';

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
