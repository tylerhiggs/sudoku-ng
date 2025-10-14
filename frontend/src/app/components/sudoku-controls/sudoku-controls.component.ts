import {
  ChangeDetectionStrategy,
  Component,
  model,
  output,
} from '@angular/core';

@Component({
  selector: 'app-sudoku-controls',
  templateUrl: './sudoku-controls.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SudokuControlsComponent {
  readonly noteMode = model.required<boolean>();

  readonly undo = output<void>();
  readonly erase = output<void>();
  readonly quickPencil = output<void>();
}
