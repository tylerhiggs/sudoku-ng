import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { expect, vi } from 'vitest';
import { SudokuTableComponent } from './sudoku-table.component';
import { SnackbarStore } from '../snackbar.store';
describe('SudokuTableComponent', () => {
  it('should render sudoku table and emit events', async () => {
    const user = userEvent.setup();
    const updateTable = vi.fn();
    const toggleNoteTable = vi.fn();
    const quickPencil = vi.fn();
    await render(SudokuTableComponent, {
      inputs: {
        originalTable: Array.from({ length: 9 }, () => Array(9).fill(0)),
        table: Array.from({ length: 9 }, () => Array(9).fill(0)),
        solvedTable: Array.from({ length: 9 }, () => Array(9).fill(1)),
        noteTable: Array.from({ length: 9 }, () =>
          Array(9).fill(Array(9).fill(false)),
        ),
      },
      on: {
        updateTable,
        toggleNoteTable,
        quickPencil,
      },
      providers: [{ provide: SnackbarStore, useValue: new SnackbarStore() }],
    });
    const cell = screen.getByTestId('cell-0-0');
    expect(cell).toBeVisible();
    await user.click(cell);
    await user.keyboard('1');
    expect(updateTable).toHaveBeenCalled();
    expect(updateTable).toHaveBeenCalledWith({ r: 0, c: 0, value: 1 });
    await user.keyboard('{ArrowRight}');
    await user.keyboard('p'); // note (pencil) mode
    await user.keyboard('2');
    expect(toggleNoteTable).toHaveBeenCalled();
    expect(toggleNoteTable).toHaveBeenCalledWith({ r: 0, c: 1, value: 1 }); // index 1 === note for 2
    await user.click(screen.getByRole('button', { name: /^pencil$/i })); // note mode off
    await user.click(screen.getByTestId('cell-1-1'));
    await user.keyboard('1');
    expect(updateTable).toHaveBeenCalled();
    expect(updateTable).toHaveBeenCalledWith({ r: 1, c: 1, value: 1 });
    await user.keyboard('{meta>}z{/meta}'); // undo
    expect(updateTable).toHaveBeenCalledWith({ r: 1, c: 1, value: 0 });
    await user.keyboard('{meta>}z{/meta}'); // undo again
    expect(toggleNoteTable).toHaveBeenCalledWith({ r: 0, c: 1, value: 1 });
    expect(toggleNoteTable).toHaveBeenCalledTimes(2); // the note and the undo
  });
});
