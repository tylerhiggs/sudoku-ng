import { Page, expect } from '@playwright/test';

/**
 * Page Object Model for Sudoku Collaboration
 */
export class CollaborationPage {
  constructor(public readonly page: Page) {}

  /**
   * Navigate to home page
   */
  async goHome() {
    await this.page.goto('/');
  }

  /**
   * Create a new collaboration game
   */
  async createGame(): Promise<string> {
    await this.goHome();
    await this.page.click('[data-testid="create-collaboration-game"]');
    await this.page.waitForURL(/\/collaborate\/[^/]+/);

    const url = this.page.url();
    const match = url.match(/\/collaborate\/([^/]+)/);
    if (!match) {
      throw new Error('Failed to extract game ID from URL');
    }

    return match[1];
  }

  /**
   * Join an existing game
   */
  async joinGame(gameId: string) {
    await this.page.goto(`/collaborate/${gameId}`);
    await this.waitForGameLoad();
  }

  /**
   * Wait for the game to fully load
   */
  async waitForGameLoad() {
    await this.page.waitForSelector('[data-testid="sudoku-table"]', {
      timeout: 10000,
    });
  }

  /**
   * Click a cell and enter a value
   */
  async setCellValue(row: number, col: number, value: string) {
    const cellSelector = `[data-testid="cell-${row}-${col}"]`;
    await this.page.click(cellSelector);
    await this.page.keyboard.press(value);
  }

  /**
   * Get the value of a cell
   */
  async getCellValue(row: number, col: number): Promise<string | null> {
    const cellSelector = `[data-testid="cell-${row}-${col}"]`;
    return await this.page.locator(cellSelector).textContent();
  }

  /**
   * Wait for a cell to have a specific value
   */
  async waitForCellValue(
    row: number,
    col: number,
    expectedValue: string,
    timeout = 5000,
  ) {
    await this.page.waitForFunction(
      ({ r, c, val }) => {
        const cell = document.querySelector(`[data-testid="cell-${r}-${c}"]`);
        return cell?.textContent?.trim() === val;
      },
      { r: row, c: col, val: expectedValue },
      { timeout },
    );
  }

  /**
   * Toggle note mode
   */
  async toggleNoteMode() {
    await this.page.click('[data-testid="note-mode-toggle"]');
  }

  /**
   * Click quick pencil button
   */
  async clickQuickPencil() {
    await this.page.click('[data-testid="quick-pencil-button"]');
  }

  /**
   * Send a chat message
   */
  async sendChatMessage(message: string) {
    const chatInput = this.page.locator('[data-testid="chat-input"]');
    await chatInput.fill(message);
    await chatInput.press('Enter');
  }

  /**
   * Wait for a chat message to appear
   */
  async waitForChatMessage(message: string, timeout = 5000) {
    await expect(this.page.locator(`text=${message}`)).toBeVisible({ timeout });
  }

  /**
   * Change player name
   */
  async changePlayerName(name: string) {
    const nameInput = this.page.locator('[data-testid="player-name-input"]');
    await nameInput.clear();
    await nameInput.fill(name);
    // Wait for debounce
    await this.page.waitForTimeout(1500);
  }

  /**
   * Get current player name
   */
  async getPlayerName(): Promise<string | null> {
    const nameInput = this.page.locator('[data-testid="player-name-input"]');
    return await nameInput.inputValue();
  }

  /**
   * Check if victory dialog is visible
   */
  async isVictoryDialogVisible(): Promise<boolean> {
    return await this.page
      .locator('[data-testid="victory-dialog"]')
      .isVisible();
  }

  /**
   * Get time elapsed
   */
  async getTimeElapsed(): Promise<string | null> {
    return await this.page
      .locator('[data-testid="time-elapsed"]')
      .textContent();
  }

  /**
   * Verify all cells match expected values
   */
  async verifyCellValues(expectedGrid: (number | string)[][]) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const value = await this.getCellValue(r, c);
        const expected = String(expectedGrid[r][c]);
        expect(value?.trim()).toBe(expected === '0' ? '' : expected);
      }
    }
  }

  /**
   * Check if a specific event type appears in chat
   */
  async hasEventInChat(eventText: RegExp | string): Promise<boolean> {
    const locator =
      typeof eventText === 'string'
        ? this.page.locator(`text=${eventText}`)
        : this.page.locator(`text=${eventText}`);
    return await locator.isVisible();
  }

  /**
   * Delete a cell value (press 0 or Backspace)
   */
  async deleteCellValue(row: number, col: number) {
    await this.setCellValue(row, col, '0');
  }

  /**
   * Get the number of visible notes in a cell
   */
  async getCellNoteCount(row: number, col: number): Promise<number> {
    const notesSelector = `[data-testid="cell-${row}-${col}-notes"]`;
    return await this.page.locator(notesSelector).count();
  }

  /**
   * Wait for a specific number of players to join (check join events in chat)
   */
  async waitForPlayerCount(count: number, timeout = 10000) {
    await this.page.waitForFunction(
      (expectedCount) => {
        const joinEvents = document.querySelectorAll('text=/joined the game/');
        return joinEvents.length >= expectedCount;
      },
      count,
      { timeout },
    );
  }
}

/**
 * Helper to create multiple collaboration pages
 */
export async function createCollaborationPages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  browser: any,
  count: number,
): Promise<CollaborationPage[]> {
  const pages: CollaborationPage[] = [];

  for (let i = 0; i < count; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    pages.push(new CollaborationPage(page));
  }

  return pages;
}

/**
 * Helper to close all collaboration pages
 */
export async function closeCollaborationPages(pages: CollaborationPage[]) {
  for (const page of pages) {
    await page.page.context().close();
  }
}

/**
 * Helper to verify all pages have consistent state
 */
export async function verifyConsistentState(
  pages: CollaborationPage[],
  row: number,
  col: number,
) {
  const values = await Promise.all(
    pages.map((page) => page.getCellValue(row, col)),
  );

  const firstValue = values[0];
  for (const value of values) {
    expect(value).toBe(firstValue);
  }

  return firstValue;
}
