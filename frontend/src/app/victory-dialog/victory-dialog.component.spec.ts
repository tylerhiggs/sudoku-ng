import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom/matchers';
import { expect, vi } from 'vitest';
import { VictoryDialogComponent } from './victory-dialog.component';
describe('VictoryDialogComponent', () => {
  it('should render victory dialog and emit events', async () => {
    const user = userEvent.setup();
    const restart = vi.fn();
    const closeDialog = vi.fn();
    await render(VictoryDialogComponent, {
      inputs: {
        open: true,
      },
      on: {
        restart,
        closeDialog,
      },
    });
    const dialogMessage = screen.getByText(/congratulations/i);
    expect(dialogMessage).toBeVisible();
    const restartButton = screen.getByRole('button', { name: /return/i });
    expect(restartButton).toBeVisible();
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeVisible();
    await user.click(restartButton);
    expect(restart).toHaveBeenCalled();
    await user.click(closeButton);
    expect(closeDialog).toHaveBeenCalled();
  });
});
