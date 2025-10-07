import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-puzzle-nav',
  imports: [],
  templateUrl: './puzzle-nav.component.html',
  providers: [],
})
export class PuzzleNavComponent {
  readonly timeElapsed = input.required<number>();
  readonly collaborationId = input<string | undefined>(undefined);
  readonly navToHome = output<void>();
  readonly collaborate = output<void>();

  readonly timeString = computed(() => {
    const time = this.timeElapsed();
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time / 60) % 60);
    const seconds = time % 60;
    return `${hours ? hours + ':' : ''}${hours ? minutes.toString().padStart(2, '0') : minutes}:${seconds.toString().padStart(2, '0')}`;
  });
}
