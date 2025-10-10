import { CollaborateComponent } from './collaborate.component';
import { expect, vi } from 'vitest';
import {
  CollaborationService,
  PlayerJoinEvent,
} from '@services/collaboration/collaboration.service';
import { of } from 'rxjs';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/angular';
import { SnackbarStore } from '@stores/snackbar.store';
import { FirebaseService } from '@services/firebase.service';
import { screen, within } from '@testing-library/dom';

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

const serviceMock = {
  joinedAt: () => 1,
  playerId: () => '1',
  playerName: () => '1',
  gameId: () => '1',
  difficulty: () => 'easy',
  createGame: vi.fn().mockResolvedValue({ gameId: '1', playerId: '1' }),
  joinGame: vi.fn().mockResolvedValue({
    difficulty: 'easy',
    hash: 1,
    isActive: true,
    originalPuzzle: currentPuzzle,
    currentTable,
    noteTable: currentNoteTable,
    solution: currentSolved,
    createdAt: 1,
    initialTimeElapsed: 0,
    lastActivity: 1,
  }),
  leaveGame: vi.fn().mockResolvedValue(undefined),
  sendChatMessage: vi.fn().mockResolvedValue(undefined),
  getGameSnapshot: vi.fn().mockReturnValue({
    difficulty: 'easy',
    hash: 1,
    isActive: true,
    originalPuzzle: currentPuzzle,
    currentTable,
    noteTable: currentNoteTable,
    solution: currentSolved,
    createdAt: 1,
    initialTimeElapsed: 0,
    lastActivity: 1,
  }),
  quickPencil: vi.fn().mockReturnValue(undefined),
  logPuzzleEvent: vi.fn().mockReturnValue(undefined),
  updatePlayerName: vi.fn().mockReturnValue(undefined),
  subscribeToChat: vi.fn().mockReturnValue(
    of({
      snapshot: {
        val: () =>
          ({
            type: 'playerJoin',
            playerId: '1',
            playerName: '1',
            timestamp: 1,
            id: '1',
          }) as PlayerJoinEvent,
      },
    }),
  ),
  subscribeToGameEvents: vi.fn().mockReturnValue(
    of({
      snapshot: {
        val: () => ({
          playerId: '1',
          playerName: '1',
          timestamp: 1,
          id: '1',
        }),
      },
    }),
  ),
};

const mockFirebaseService = {
  tryPopulateLocalUnsolvedStore: vi.fn().mockResolvedValue(undefined),
  completePuzzle: vi.fn().mockResolvedValue(undefined),
};

describe('CollaborateComponent', () => {
  it('should create', async () => {
    const user = userEvent.setup();
    await render(CollaborateComponent, {
      providers: [
        { provide: SnackbarStore, useValue: new SnackbarStore() },
        { provide: CollaborationService, useValue: serviceMock },
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
      inputs: { gameId: '1' },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const cell = screen.getByTestId('cell-0-0');
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
