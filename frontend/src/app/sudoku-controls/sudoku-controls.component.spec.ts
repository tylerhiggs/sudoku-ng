import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { expect, vi } from 'vitest';
import { SudokuControlsComponent } from './sudoku-controls.component';
describe('SudokuControlsComponent', () => {
  it('should render sudoku controls and emit events', async () => {
    const user = userEvent.setup();
    const undo = vi.fn();
    const erase = vi.fn();
    const quickPencil = vi.fn();
    await render(SudokuControlsComponent, {
      inputs: {
        noteMode: false,
      },
      on: {
        undo,
        erase,
        quickPencil,
      },
    });
    const undoButton = screen.getByRole('button', { name: /undo/i });
    expect(undoButton).toBeVisible();
    const eraseButton = screen.getByRole('button', { name: /erase/i });
    expect(eraseButton).toBeVisible();
    const pencilButton = screen.getByRole('button', { name: /quick pencil/i });
    expect(pencilButton).toBeVisible();
    const noteButton = screen.getByRole('button', { name: /^pencil$/i });
    expect(noteButton).toBeVisible();
    await user.click(undoButton);
    expect(undo).toHaveBeenCalled();
    await user.click(eraseButton);
    expect(erase).toHaveBeenCalled();
    await user.click(pencilButton);
    expect(quickPencil).toHaveBeenCalled();
  });
});
