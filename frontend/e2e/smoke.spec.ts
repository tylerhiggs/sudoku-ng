import { test, expect } from '@playwright/test';

/**
 * Simple smoke tests to verify basic functionality
 */
test.describe('Smoke Tests', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Sudoku/i);
  });

  test('can navigate to home page', async ({ page }) => {
    await page.goto('/');

    // Check for key elements (this already waits for visibility)
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});
