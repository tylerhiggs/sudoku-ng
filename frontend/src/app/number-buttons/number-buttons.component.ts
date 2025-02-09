import {
  Component,
  input,
  ChangeDetectionStrategy,
  output,
} from '@angular/core';

@Component({
  selector: 'app-number-buttons',
  imports: [],
  templateUrl: './number-buttons.component.html',
  styleUrl: './number-buttons.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumberButtonsComponent {
  readonly numLeft = input.required<number[]>();
  readonly noteMode = input.required<boolean>();

  readonly numberClick = output<number>();

  readonly onNumberClick = (index: number) => {
    this.numberClick.emit(index + 1);
  };
}
