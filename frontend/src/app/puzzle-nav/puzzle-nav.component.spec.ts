import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom/matchers';
import { expect, vi } from 'vitest';
import { PuzzleNavComponent } from './puzzle-nav.component';
describe('PuzzleNavComponent', () => {
  it('should render puzzle navigation buttons and emit click events', async () => {
    const user = userEvent.setup();
    const navToHome = vi.fn();
    await render(PuzzleNavComponent, {
      inputs: {
        timeElapsed: 3661, // 1 hour, 1 minute, and 1 second
      },
      on: {
        navToHome,
      },
    });
    const timeDisplay = screen.getByText('1:01:01');
    expect(timeDisplay).toBeVisible();
    const homeButton = screen.getByRole('button', { name: /back/i });
    expect(homeButton).toBeVisible();
    await user.click(homeButton);
    expect(navToHome).toHaveBeenCalled();
  });
});
