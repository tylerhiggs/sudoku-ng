# Playwright Test Troubleshooting Guide

## Common Issues and Solutions

### Issue: "No unsolved puzzles" Error

**Error Message:**

```
Error: No unsolved puzzles
    at request.onsuccess (http://localhost:4200/chunk-4YH6RKB4.js:178:18)
```

**Cause:**
The app loads puzzles from Firebase into IndexedDB when the home page loads. In Playwright tests, each browser context starts with a fresh, empty IndexedDB. When tests try to click difficulty buttons (Easy, Medium, etc.) before the puzzles are loaded, the app throws "No unsolved puzzles" error.

**Solution:**
Wait for the home page to finish loading before interacting with difficulty buttons:

```typescript
async function createGame(page: Page): Promise<string> {
  await page.goto("/");

  const easyButton = page.getByRole("button", { name: /easy/i });
  await easyButton.waitFor({ state: "attached" });

  // Wait for loading to complete (buttons are disabled during loading)
  await expect(easyButton).not.toBeDisabled({ timeout: 30000 });

  await easyButton.click();
  // ... rest of function
}
```

**Why This Works:**

1. The `HomeComponent` runs `firebaseService.tryPopulateLocalUnsolvedStore()` on init
2. While loading, the difficulty buttons are disabled
3. Once puzzles are loaded into IndexedDB, buttons become enabled
4. Waiting for the button to be enabled ensures puzzles are ready

### Issue: Tests Timing Out

**Symptoms:**

- Tests hang or timeout
- Browser contexts don't close properly

**Solutions:**

1. Check if the dev server is running on the correct port (4200)
2. Increase timeout for slow operations:
   ```typescript
   await expect(element).toBeVisible({ timeout: 10000 });
   ```
3. Ensure all browser contexts are properly closed in `finally` blocks

### Issue: Element Not Found

**Error Message:**

```
Error: locator.click: Selector "[data-testid='cell-0-0']" did not match any elements
```

**Cause:**
The HTML elements don't have the required `data-testid` attributes.

**Solution:**
Follow the guide in `ADDING_TEST_IDS.md` to add test IDs to your components.

### Issue: Firebase Connection Errors

**Symptoms:**

- Tests fail with Firebase authentication errors
- Network timeout errors

**Solutions:**

1. Ensure your Firebase project is configured correctly
2. Check that `firebase.json` and `.firebaserc` are present
3. Verify Firebase emulators are running if using local development
4. Check network connectivity

## Best Practices

### 1. Always Use Proper Waits

```typescript
// ❌ BAD: Fixed timeout
await page.waitForTimeout(5000);

// ✅ GOOD: Wait for specific condition
await page.waitForSelector('[data-testid="sudoku-table"]');
await expect(element).toBeVisible();
```

### 2. Clean Up Resources

```typescript
try {
  // Test code
} finally {
  await context1.close();
  await context2.close();
}
```

### 3. Use Realistic Test Data

Use the fixtures in `e2e/fixtures.ts` for consistent test puzzles.

### 4. Test Isolation

Each test should be independent and not rely on state from other tests.

## Debugging Tips

### 1. Run Tests in Headed Mode

```bash
npx playwright test --headed
```

### 2. Use Debug Mode

```bash
npx playwright test --debug
```

### 3. Take Screenshots on Failure

Already configured in `playwright.config.ts`:

```typescript
screenshot: "only-on-failure";
```

### 4. Check Browser Console

```typescript
page.on("console", (msg) => console.log("BROWSER:", msg.text()));
page.on("pageerror", (error) => console.log("PAGE ERROR:", error));
```

### 5. Slow Down Execution

```typescript
const context = await browser.newContext({
  slowMo: 1000, // Slow down by 1 second
});
```

## Running Tests

### Run All Tests

```bash
npm run test:e2e
```

### Run Specific Test File

```bash
npx playwright test smoke.spec.ts
```

### Run in Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run with UI Mode

```bash
npx playwright test --ui
```

### Generate Test Report

```bash
npx playwright show-report
```

## Environment Requirements

- Node.js 18+ or Bun
- Playwright browsers installed: `npx playwright install`
- Dev server running on http://localhost:4200
- Firebase project configured (or emulators running)

## Further Help

- [Playwright Documentation](https://playwright.dev)
- [Angular Testing Guide](https://angular.dev/guide/testing)
- See `README.md` in the `e2e` folder for more information
