import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { expect, vi } from 'vitest';
import { AppComponent } from './app.component';
import { SnackbarStore } from './snackbar.store';
import { within } from '@testing-library/dom';
import { FirebaseService } from './firebase.service';

const localStorageMock = (() => {
  const currentPuzzle = [
    [2, 5, 0, 0, 0, 0, 0, 9, 0],
    [6, 0, 4, 9, 8, 0, 0, 7, 3],
    [0, 7, 3, 4, 5, 1, 0, 0, 0],
    [0, 3, 7, 2, 0, 8, 6, 5, 9],
    [8, 9, 1, 0, 4, 5, 0, 3, 7],
    [0, 2, 6, 3, 0, 0, 0, 0, 1],
    [3, 4, 0, 8, 9, 6, 0, 0, 2],
    [0, 0, 0, 5, 0, 0, 9, 4, 8],
    [7, 8, 9, 0, 2, 0, 3, 6, 5],
  ];
  const currentSolved = [
    [2, 5, 8, 7, 6, 3, 1, 9, 4],
    [6, 1, 4, 9, 8, 2, 5, 7, 3],
    [9, 7, 3, 4, 5, 1, 8, 2, 6],
    [4, 3, 7, 2, 1, 8, 6, 5, 9],
    [8, 9, 1, 6, 4, 5, 2, 3, 7],
    [5, 2, 6, 3, 7, 9, 4, 8, 1],
    [3, 4, 5, 8, 9, 6, 7, 1, 2],
    [1, 6, 2, 5, 3, 7, 9, 4, 8],
    [7, 8, 9, 1, 2, 4, 3, 6, 5],
  ];
  const currentTable = [
    [2, 5, 8, 7, 6, 3, 1, 9, 4],
    [6, 1, 4, 9, 8, 2, 5, 7, 3],
    [9, 7, 3, 4, 5, 1, 8, 2, 6],
    [4, 3, 7, 2, 1, 8, 6, 5, 9],
    [8, 9, 1, 6, 4, 5, 2, 3, 7],
    [5, 2, 6, 3, 7, 9, 4, 8, 1],
    [3, 4, 5, 8, 9, 6, 7, 1, 2],
    [1, 6, 2, 5, 0, 0, 9, 4, 8], // only 3 and 7 needed to solve when replacing 0s
    [7, 8, 9, 1, 2, 4, 3, 6, 5],
  ];
  const currentNoteTable = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => Array(9).fill(false)),
  );
  const store: Record<string, string> = {
    currentPuzzle: JSON.stringify(currentPuzzle),
    currentSolved: JSON.stringify(currentSolved),
    currentTable: JSON.stringify(currentTable),
    currentNoteTable: JSON.stringify(currentNoteTable),
    currentDifficulty: '"easy"',
    currentHash: '123456789',
  };
  return {
    getItem: (key: string) => store[key],
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
      return Promise.resolve();
    },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('AppComponent', () => {
  it('should render sudoku table and emit events', async () => {
    const user = userEvent.setup();
    await render(AppComponent, {
      providers: [
        { provide: SnackbarStore, useValue: new SnackbarStore() },
        {
          provide: FirebaseService,
          useValue: {
            tryPopulateLocalUnsolvedStore: vi.fn().mockResolvedValue(undefined),
            getRandomPuzzle: vi.fn().mockResolvedValue({
              puzzle: [
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9],
              ],
              solution: [
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9],
              ],
              hash: '123456789',
            }),
            completePuzzle: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    });
    const cell = screen.getByTestId('cell-0-0');
    expect(cell).toBeVisible();
    expect(within(cell).getByText(2)).toBeVisible();
    const emptyCell = screen.getByTestId('cell-7-4');
    expect(emptyCell).toBeVisible();
    await user.click(emptyCell);
    await user.keyboard('3');
    expect(within(screen.getByTestId('cell-7-4')).getByText(3)).toBeVisible();
    await user.keyboard('{ArrowRight}');
    await user.keyboard('p'); // note (pencil) mode on
    await user.keyboard('7');
    expect(within(screen.getByTestId('note-7-5-7')).getByText(7)).toBeVisible();
  });
});
