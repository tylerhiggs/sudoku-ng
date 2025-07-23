import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-victory-dialog',
  imports: [],
  templateUrl: './victory-dialog.component.html',
})
export class VictoryDialogComponent {
  readonly open = input<boolean>();
  readonly closeDialog = output<void>();
  readonly restart = output<void>();
}
