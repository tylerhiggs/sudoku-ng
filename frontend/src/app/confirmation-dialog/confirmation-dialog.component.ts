import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirmation-dialog',
  imports: [],
  templateUrl: './confirmation-dialog.component.html',
})
export class ConfirmationDialogComponent {
  readonly open = input<boolean>();
  readonly onClose = output<void>();
  readonly onConfirm = output<void>();
  readonly title = input<string>();
  readonly message = input<string>();
}
