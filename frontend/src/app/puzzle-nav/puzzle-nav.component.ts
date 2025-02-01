import { Component, output } from '@angular/core';

@Component({
  selector: 'app-puzzle-nav',
  imports: [],
  templateUrl: './puzzle-nav.component.html',
})
export class PuzzleNavComponent {
  readonly navToHome = output<void>();
}
