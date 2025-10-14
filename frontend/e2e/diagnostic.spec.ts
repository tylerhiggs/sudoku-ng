import { test, expect } from '@playwright/test';

/**
 * Diagnostic test to verify basic collaboration setup
 */
test('can load game and find cells', async ({ page }) => {
  await page.goto('/');

  // Wait for puzzles to load
  const easyButton = page.getByRole('button', { name: /easy/i });
  await easyButton.waitFor({ state: 'attached' });
  await expect(easyButton).not.toBeDisabled({ timeout: 30000 });

  await easyButton.click();

  // Wait for navigation to current-puzzle page
  await page.waitForURL(/\/current-puzzle/);

  // Verify sudoku table is present
  await page.waitForSelector('[data-testid="sudoku-table"]');

  // Find an empty cell
  let emptyCell = null;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = page.locator(`[data-testid="cell-${r}-${c}"]`);
      const text = await cell.textContent();
      if (!text || text.trim() === '') {
        emptyCell = { r, c, cell };
        break;
      }
    }
    if (emptyCell) break;
  }

  if (!emptyCell) {
    throw new Error('No empty cells found!');
  }

  // Click the empty cell
  await emptyCell.cell.click();

  // Try to press a number
  await page.keyboard.press('5');

  // Wait a bit
  await page.waitForTimeout(1000);

  // Navigate to collaborate
  await page.getByRole('button', { name: /collaborate/i }).click();
  await page.waitForURL(/\/collaborate\/[^/]+/);

  // Verify table is still there
  await page.waitForSelector('[data-testid="sudoku-table"]');
});
