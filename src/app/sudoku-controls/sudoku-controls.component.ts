import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'app-sudoku-controls',
  templateUrl: './sudoku-controls.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SudokuControlsComponent {
  readonly noteMode = input.required<boolean>();

  readonly noteModeChange = output<void>();
  readonly undo = output<void>();
  readonly erase = output<void>();
}
