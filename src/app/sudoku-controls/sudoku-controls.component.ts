import {
  ChangeDetectionStrategy,
  Component,
  input,
  Output,
  EventEmitter,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sudoku-controls',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './sudoku-controls.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SudokuControlsComponent {
  noteMode = input.required<boolean>();

  @Output() noteModeChange = new EventEmitter<void>();
  @Output() undo = new EventEmitter<void>();
  @Output() erase = new EventEmitter<void>();
}
