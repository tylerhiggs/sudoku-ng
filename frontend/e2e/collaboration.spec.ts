import { test, expect, type Page } from '@playwright/test';
import { LOCAL_STORAGE_KEYS } from '../src/constants';

/**
 * Helper function to wait for a specific cell value to appear
 */
async function waitForCellValue(
  page: Page,
  row: number,
  col: number,
  expectedValue: string,
  timeout = 5000,
) {
  await page.waitForFunction(
    ({ r, c, val }) => {
      const cell = document.querySelector(`[data-testid="cell-${r}-${c}"]`);
      return cell?.textContent?.trim() === val;
    },
    { r: row, c: col, val: expectedValue },
    { timeout },
  );
}

/**
 * Helper function to find the correct value for a specific cell
 * Reads from localStorage to get the solved puzzle and returns the correct answer
 */
async function findCorrectValue(
  page: Page,
  row: number,
  col: number,
): Promise<string> {
  const solvedKey = LOCAL_STORAGE_KEYS.CURRENT_SOLVED;

  // Get the solved puzzle from localStorage
  const solvedPuzzle = await page.evaluate((key) => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }, solvedKey);

  if (!solvedPuzzle || !Array.isArray(solvedPuzzle)) {
    throw new Error(
      `No solved puzzle found in localStorage under key: ${solvedKey}`,
    );
  }

  // The solved puzzle should be a 9x9 array
  if (!solvedPuzzle[row] || solvedPuzzle[row][col] === undefined) {
    throw new Error(`Invalid cell coordinates: ${row},${col}`);
  }

  const correctValue = solvedPuzzle[row][col];

  if (
    typeof correctValue !== 'number' ||
    correctValue < 1 ||
    correctValue > 9
  ) {
    throw new Error(`Invalid value at cell ${row},${col}: ${correctValue}`);
  }

  return String(correctValue);
}

async function getAllValidValues(
  page: Page,
  row: number,
  col: number,
): Promise<string[]> {
  const currentTableKey = LOCAL_STORAGE_KEYS.CURRENT_TABLE;
  const currentTable = await page.evaluate((key) => {
    const storedTable = localStorage.getItem(key);
    return storedTable ? (JSON.parse(storedTable) as number[][]) : null;
  }, currentTableKey);
  if (!currentTable) {
    throw new Error('No current puzzle found in localStorage');
  }
  return ['1', '2', '3', '4', '5', '6', '7', '8', '9'].filter((val) => {
    const num = parseInt(val);
    return (
      !currentTable[row].includes(num) &&
      !currentTable.some((r) => r[col] === num) &&
      !checkValueInBox(currentTable, row, col, num)
    );
  });
}

function checkValueInBox(
  table: number[][],
  row: number,
  col: number,
  value: number,
): boolean {
  const boxStartRow = Math.floor(row / 3) * 3;
  const boxStartCol = Math.floor(col / 3) * 3;
  for (let r = boxStartRow; r < boxStartRow + 3; r++) {
    for (let c = boxStartCol; c < boxStartCol + 3; c++) {
      if (table[r][c] === value) {
        return true;
      }
    }
  }
  return false;
}

async function findValidIncorrectValues(
  page: Page,
  row: number,
  col: number,
): Promise<string[]> {
  const allValid = await getAllValidValues(page, row, col);
  const correct = await findCorrectValue(page, row, col);
  return allValid.filter((val) => val !== correct);
}

/**
 * Helper function to click a cell and enter a value
 */
async function setCellValue(
  page: Page,
  row: number,
  col: number,
  value: string,
) {
  const cellSelector = `[data-testid="cell-${row}-${col}"]`;
  const cell = page.locator(cellSelector);

  // Click the cell to select it
  await cell.click();

  // Wait a moment for the cell to be highlighted
  await page.waitForTimeout(100);

  // Press the key on the page (document level)
  await page.keyboard.press(value);

  // Wait for the value to be updated
  await page.waitForTimeout(100);
}

/**
 * Helper function to find empty cells in the puzzle
 */
async function findEmptyCells(
  page: Page,
  count = 3,
): Promise<{ row: number; col: number }[]> {
  const tableKey = LOCAL_STORAGE_KEYS.CURRENT_TABLE;
  const table = await page.evaluate((key) => {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as number[][]) : null;
  }, tableKey);
  if (!table) {
    throw new Error(
      `No current puzzle found in localStorage under key: ${tableKey}`,
    );
  }
  const emptyCells = table
    .flatMap((row, r) =>
      row.map((cell, c) => (cell === 0 ? { row: r, col: c } : false)),
    )
    .filter((o) => o) as { row: number; col: number }[];

  if (emptyCells.length < count) {
    throw new Error(
      `Only found ${emptyCells.length} empty cells, needed ${count}`,
    );
  }

  return emptyCells;
}

/**
 * Helper function to create a new game and return the game ID
 */
async function createGame(page: Page): Promise<string> {
  await page.goto('/');

  // Wait for the page to finish loading puzzles from Firebase into IndexedDB
  // The home page component calls tryPopulateLocalUnsolvedStore() on init
  const easyButton = page.getByRole('button', { name: /easy/i });
  await easyButton.waitFor({ state: 'attached' });

  // Wait for loading to complete (buttons are disabled during loading)
  await expect(easyButton).not.toBeDisabled({ timeout: 30000 });

  await easyButton.click();

  // Wait for navigation to collaboration page
  await page.waitForURL(/\/current-puzzle/);

  await page.getByRole('button', { name: /collaborate/i }).click();

  await page.waitForURL(/\/collaborate\/[^/]+/);

  // Extract game ID from URL
  const url = page.url();
  const match = url.match(/\/collaborate\/([^/]+)/);
  if (!match) {
    throw new Error('Failed to extract game ID from URL');
  }

  return match[1];
}

test.describe('Collaborative Puzzle Solving', () => {
  test('two players can collaborate on the same puzzle', async ({
    browser,
  }) => {
    // Create two separate browser contexts (different "players")
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const player1Page = await context1.newPage();
    const player2Page = await context2.newPage();

    try {
      // Player 1 creates a game
      const gameId = await createGame(player1Page);

      // Wait for game to load for player 1
      await player1Page.waitForSelector('[data-testid="sudoku-table"]', {
        timeout: 10000,
      });

      // Player 2 joins the same game
      await player2Page.goto(`/collaborate/${gameId}`);
      await player2Page.waitForSelector('[data-testid="sudoku-table"]', {
        timeout: 10000,
      });

      // Verify both players see the join event in chat
      await expect(
        player1Page.locator('text=/joined the game/').first(),
      ).toBeVisible({
        timeout: 5000,
      });
      await expect(
        player2Page.locator('text=/joined the game/').first(),
      ).toBeVisible({
        timeout: 5000,
      });

      // Find empty cells that can be edited
      const emptyCells = await findEmptyCells(player1Page, 2);
      const [emptyCell1, emptyCell2] = emptyCells;

      // Find valid values for each cell
      const value1 = await findCorrectValue(
        player1Page,
        emptyCell1.row,
        emptyCell1.col,
      );
      const value2 = await findCorrectValue(
        player1Page,
        emptyCell2.row,
        emptyCell2.col,
      );

      // Player 1 makes a move
      await setCellValue(player1Page, emptyCell1.row, emptyCell1.col, value1);

      // Verify Player 2 sees the update
      await waitForCellValue(
        player2Page,
        emptyCell1.row,
        emptyCell1.col,
        value1,
      );

      // Verify the cell update event appears in Player 2's chat
      await expect(player2Page.locator('text=/updated/')).toBeVisible({
        timeout: 5000,
      });

      // Player 2 makes a move (using a different empty cell)
      await setCellValue(player2Page, emptyCell2.row, emptyCell2.col, value2);

      // Verify Player 1 sees the update
      await waitForCellValue(
        player1Page,
        emptyCell2.row,
        emptyCell2.col,
        value2,
      );

      // Verify both players see the same state
      const player1CellValue = await player1Page
        .locator(`[data-testid="cell-${emptyCell2.row}-${emptyCell2.col}"]`)
        .textContent();
      const player2CellValue = await player2Page
        .locator(`[data-testid="cell-${emptyCell2.row}-${emptyCell2.col}"]`)
        .textContent();
      expect(player1CellValue?.trim()).toBe(value2);
      expect(player2CellValue?.trim()).toBe(value2);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('three players can collaborate simultaneously', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();

    const player1Page = await context1.newPage();
    const player2Page = await context2.newPage();
    const player3Page = await context3.newPage();

    try {
      // Player 1 creates game
      const gameId = await createGame(player1Page);
      await player1Page.waitForSelector('[data-testid="sudoku-table"]');

      // Players 2 and 3 join
      await Promise.all([
        player2Page.goto(`/collaborate/${gameId}`),
        player3Page.goto(`/collaborate/${gameId}`),
      ]);

      await Promise.all([
        player2Page.waitForSelector('[data-testid="sudoku-table"]'),
        player3Page.waitForSelector('[data-testid="sudoku-table"]'),
      ]);

      const [emptyCell1, emptyCell2, emptyCell3] = await findEmptyCells(
        player1Page,
        3,
      );
      const [value1, value2, value3] = await Promise.all([
        findCorrectValue(player1Page, emptyCell1.row, emptyCell1.col),
        findCorrectValue(player1Page, emptyCell2.row, emptyCell2.col),
        findCorrectValue(player1Page, emptyCell3.row, emptyCell3.col),
      ]);
      // All three players make different moves
      await Promise.all([
        setCellValue(player1Page, emptyCell1.row, emptyCell1.col, value1),
        setCellValue(player2Page, emptyCell2.row, emptyCell2.col, value2),
        setCellValue(player3Page, emptyCell3.row, emptyCell3.col, value3),
      ]);

      // Wait a bit for all updates to propagate
      await player1Page.waitForTimeout(2000);

      // Verify all players see all three moves
      await Promise.all([
        waitForCellValue(player1Page, emptyCell1.row, emptyCell1.col, value1),
        waitForCellValue(player1Page, emptyCell2.row, emptyCell2.col, value2),
        waitForCellValue(player1Page, emptyCell3.row, emptyCell3.col, value3),

        waitForCellValue(player2Page, emptyCell1.row, emptyCell1.col, value1),
        waitForCellValue(player2Page, emptyCell2.row, emptyCell2.col, value2),
        waitForCellValue(player2Page, emptyCell3.row, emptyCell3.col, value3),

        waitForCellValue(player3Page, emptyCell1.row, emptyCell1.col, value1),
        waitForCellValue(player3Page, emptyCell2.row, emptyCell2.col, value2),
        waitForCellValue(player3Page, emptyCell3.row, emptyCell3.col, value3),
      ]);
    } finally {
      await context1.close();
      await context2.close();
      await context3.close();
    }
  });

  test('handles concurrent updates to the same cell', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const player1Page = await context1.newPage();
    const player2Page = await context2.newPage();

    try {
      // Player 1 creates game
      const gameId = await createGame(player1Page);
      await player1Page.waitForSelector('[data-testid="sudoku-table"]');

      // Player 2 joins
      await player2Page.goto(`/collaborate/${gameId}`);
      await player2Page.waitForSelector('[data-testid="sudoku-table"]');

      // Find an empty cell with at least 2 valid incorrect values
      // Get all available empty cells
      let emptyCells: { row: number; col: number }[] = [];

      const tableKey = LOCAL_STORAGE_KEYS.CURRENT_TABLE;
      const table = await player1Page.evaluate((key) => {
        const item = localStorage.getItem(key);
        return item ? (JSON.parse(item) as number[][]) : null;
      }, tableKey);

      if (table) {
        emptyCells = table
          .flatMap((row, r) =>
            row.map((cell, c) => (cell === 0 ? { row: r, col: c } : null)),
          )
          .filter((o) => o !== null) as { row: number; col: number }[];
      }

      let targetCell: { row: number; col: number } | null = null;
      let validIncorrectValues: string[] = [];

      for (const cell of emptyCells) {
        const incorrectVals = await findValidIncorrectValues(
          player1Page,
          cell.row,
          cell.col,
        );
        if (incorrectVals.length >= 2) {
          targetCell = cell;
          validIncorrectValues = incorrectVals;
          break;
        }
      }

      if (!targetCell || validIncorrectValues.length < 2) {
        throw new Error(
          'Could not find an empty cell with at least 2 valid incorrect values',
        );
      }

      const { row: i, col: j } = targetCell;
      // Both players try to update the same cell at nearly the same time
      await Promise.all([
        setCellValue(player1Page, i, j, validIncorrectValues[0]),
        setCellValue(player2Page, i, j, validIncorrectValues[1]),
      ]);

      // Wait for synchronization
      await Promise.all([
        player1Page.waitForTimeout(2000),
        player2Page.waitForTimeout(2000),
      ]);

      // Both players should eventually see the same value (last write wins)
      const player1Value = await player1Page
        .locator(`[data-testid="cell-${i}-${j}"]`)
        .textContent();
      const player2Value = await player2Page
        .locator(`[data-testid="cell-${i}-${j}"]`)
        .textContent();

      const correctValue = await findCorrectValue(player1Page, i, j);
      expect(player1Value).not.toBe(correctValue);
      expect(player2Value).not.toBe(correctValue);
      expect(player1Value).toBe(player2Value);
      // The value should be either 5 or 7 depending on which write came last
      expect([validIncorrectValues[0], validIncorrectValues[1]]).toContain(
        player1Value,
      );
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('chat messages are synchronized between players', async ({
    browser,
  }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const player1Page = await context1.newPage();
    const player2Page = await context2.newPage();

    try {
      // Player 1 creates game
      const gameId = await createGame(player1Page);
      await player1Page.waitForSelector('[data-testid="sudoku-table"]');

      // Player 2 joins
      await player2Page.goto(`/collaborate/${gameId}`);
      await player2Page.waitForSelector('[data-testid="sudoku-table"]');

      // Player 1 sends a chat message
      const chatInput1 = player1Page.locator('[data-testid="chat-input"]');
      await chatInput1.fill('Hello from Player 1!');
      await chatInput1.press('Enter');

      // Verify Player 2 sees the message
      await expect(
        player2Page.locator('text=Hello from Player 1!'),
      ).toBeVisible({ timeout: 5000 });

      // Player 2 replies
      const chatInput2 = player2Page.locator('[data-testid="chat-input"]');
      await chatInput2.fill('Hi from Player 2!');
      await chatInput2.press('Enter');

      // Verify Player 1 sees the reply
      await expect(player1Page.locator('text=Hi from Player 2!')).toBeVisible({
        timeout: 5000,
      });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('quick pencil is synchronized between players', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const player1Page = await context1.newPage();
    const player2Page = await context2.newPage();

    try {
      // Player 1 creates game
      const gameId = await createGame(player1Page);
      await player1Page.waitForSelector('[data-testid="sudoku-table"]');

      // Player 2 joins
      await player2Page.goto(`/collaborate/${gameId}`);
      await player2Page.waitForSelector('[data-testid="sudoku-table"]');

      // Player 1 clicks quick pencil
      await player1Page.click('[data-testid="quick-pencil-button"]');

      // Wait for synchronization
      await player1Page.waitForTimeout(1000);

      // Verify Player 2 sees the quick pencil event in chat
      await expect(
        player2Page.locator('text=/used Quick Pencil/i'),
      ).toBeVisible({
        timeout: 5000,
      });

      // find an empty cell to verify notes are visible
      const emptyCells = await findEmptyCells(player1Page, 1);
      const { row: i, col: j } = emptyCells[0];

      // Verify notes are visible for both players (check a specific cell)
      const player1Notes = await player1Page
        .locator(`[data-testid="cell-${i}-${j}-notes"]`)
        .count();
      const player2Notes = await player2Page
        .locator(`[data-testid="cell-${i}-${j}-notes"]`)
        .count();

      expect(player1Notes).toBeGreaterThan(0);
      expect(player2Notes).toBeGreaterThan(0);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('player name changes are synchronized', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const player1Page = await context1.newPage();
    const player2Page = await context2.newPage();

    try {
      // Player 1 creates game
      const gameId = await createGame(player1Page);
      await player1Page.waitForSelector('[data-testid="sudoku-table"]');

      // Player 2 joins
      await player2Page.goto(`/collaborate/${gameId}`);
      await player2Page.waitForSelector('[data-testid="sudoku-table"]');

      // Player 1 changes their name
      const nameInput = player1Page.locator(
        '[data-testid="player-name-input"]',
      );
      await nameInput.clear();
      await nameInput.fill('Alice');

      // Wait for debounce
      await player1Page.waitForTimeout(1500);

      // Player 1 makes a move
      const cell = await findEmptyCells(player1Page, 1);
      const { row, col } = cell[0];
      const correctValue = await findCorrectValue(player1Page, row, col);
      await setCellValue(player1Page, row, col, correctValue);
      await waitForCellValue(player2Page, row, col, correctValue);
      // Verify Player 2 sees the new name in the event
      await expect(player2Page.locator('text=/Alice.*updated/')).toBeVisible({
        timeout: 5000,
      });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('handles player leaving and rejoining', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const player1Page = await context1.newPage();
    const player2Page = await context2.newPage();

    try {
      // Player 1 creates game
      const gameId = await createGame(player1Page);
      await player1Page.waitForSelector('[data-testid="sudoku-table"]');

      // Player 2 joins
      await player2Page.goto(`/collaborate/${gameId}`);
      await player2Page.waitForSelector('[data-testid="sudoku-table"]');

      // Player 1 makes a move
      const cell = await findEmptyCells(player1Page, 1);
      const { row, col } = cell[0];
      const correctValue = await findCorrectValue(player1Page, row, col);
      await setCellValue(player1Page, row, col, correctValue);
      await waitForCellValue(player2Page, row, col, correctValue);

      // Player 2 leaves (navigate away)
      await player2Page.goto('/');

      // Player 1 makes another move while Player 2 is gone
      const cell2 = await findEmptyCells(player1Page, 1);
      const { row: row2, col: col2 } = cell2[0];
      const correctValue2 = await findCorrectValue(player1Page, row2, col2);
      await setCellValue(player1Page, row2, col2, correctValue2);
      await waitForCellValue(player1Page, row2, col2, correctValue2);

      // Player 2 rejoins
      await player2Page.goto(`/collaborate/${gameId}`);
      await player2Page.waitForSelector('[data-testid="sudoku-table"]');

      // Verify Player 2 sees all the moves (including the one made while away)
      await waitForCellValue(player2Page, row, col, correctValue);
      await waitForCellValue(player2Page, row2, col2, correctValue2);
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
