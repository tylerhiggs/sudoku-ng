import {
  Component,
  input,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
} from '@angular/core';

@Component({
  selector: 'app-number-buttons',
  standalone: true,
  imports: [],
  templateUrl: './number-buttons.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumberButtonsComponent {
  numLeft = input.required<number[]>();

  @Output() numberClick = new EventEmitter<number>();

  onNumberClick = (index: number) => {
    this.numberClick.emit(index + 1);
  };
}
