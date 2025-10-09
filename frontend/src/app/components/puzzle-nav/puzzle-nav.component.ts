import { Component, computed, inject, input, output } from '@angular/core';
import { SnackbarStore } from '@stores/snackbar.store';
import { cn } from '@utils/cn';

@Component({
  selector: 'app-puzzle-nav',
  templateUrl: './puzzle-nav.component.html',
})
export class PuzzleNavComponent {
  readonly timeElapsed = input.required<number>();
  readonly isCollaboration = input<boolean>(false);
  readonly difficulty = input<string | undefined>(undefined);
  readonly navToHome = output<void>();
  readonly collaborate = output<void>();

  readonly snackbarStore = inject(SnackbarStore);

  readonly shareCollaborationLink = () => {
    navigator.clipboard.writeText(window.location.href);
    this.snackbarStore.enqueue('Link copied to clipboard', 'info');
  };

  readonly timeString = computed(() => {
    const time = this.timeElapsed();
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time / 60) % 60);
    const seconds = time % 60;
    return `${hours ? hours + ':' : ''}${hours ? minutes.toString().padStart(2, '0') : minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  readonly cn = cn;
}
