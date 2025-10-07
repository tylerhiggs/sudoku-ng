import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom/matchers';
import { expect, vi } from 'vitest';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';
describe('ConfirmationDialogComponent', () => {
  it('should render confirmation dialog and emit events', async () => {
    const user = userEvent.setup();
    const confirm = vi.fn();
    const closeDialog = vi.fn();
    const title = Math.random().toString(36).substring(2, 15);
    const message = Math.random().toString(36).substring(2, 15);
    await render(ConfirmationDialogComponent, {
      inputs: {
        open: true,
        title,
        message,
      },
      on: {
        confirm,
        closeDialog,
      },
    });
    const dialogTitle = screen.getByText(title);
    expect(dialogTitle).toBeVisible();
    const dialogMessage = screen.getByText(message);
    expect(dialogMessage).toBeVisible();
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    expect(confirmButton).toBeVisible();
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeVisible();
    await user.click(confirmButton);
    expect(confirm).toHaveBeenCalled();
    await user.click(closeButton);
    expect(closeDialog).toHaveBeenCalled();
  });
});
