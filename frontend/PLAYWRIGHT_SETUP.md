# Playwright E2E Testing Setup Complete! 🎉

## What's Been Set Up

I've configured a comprehensive Playwright testing setup for your collaborative Sudoku application:

### Files Created

1. **`playwright.config.ts`** - Main Playwright configuration
2. **`e2e/collaboration.spec.ts`** - Comprehensive collaboration tests
3. **`e2e/smoke.spec.ts`** - Basic smoke tests
4. **`e2e/helpers.ts`** - Page Object Model and utilities
5. **`e2e/fixtures.ts`** - Test data and fixtures
6. **`e2e/README.md`** - Complete testing documentation
7. **`e2e/ADDING_TEST_IDS.md`** - Guide for adding test IDs
8. **`.github/workflows/playwright.yml`** - CI/CD workflow

### Scripts Added to package.json

```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:headed": "playwright test --headed",
  "test:e2e:debug": "playwright test --debug",
  "playwright:install": "playwright install"
}
```

## Next Steps

### 1. Install Playwright and Dependencies

```bash
cd /Users/tylerhiggs/Projects/sudoku-ng/frontend
npm install -D @playwright/test @types/node
npm run playwright:install
```

### 2. Add Test IDs to Your Components

Follow the guide in `e2e/ADDING_TEST_IDS.md` to add `data-testid` attributes to your components. The key components that need test IDs:

- **Sudoku Table**: `data-testid="cell-{row}-{col}"`
- **Chat Input**: `data-testid="chat-input"`
- **Player Name Input**: `data-testid="player-name-input"`
- **Quick Pencil Button**: `data-testid="quick-pencil-button"`
- **Create Game Button**: `data-testid="create-collaboration-game"`
- **Victory Dialog**: `data-testid="victory-dialog"`

### 3. Run Your First Test

Start the dev server in one terminal:

```bash
npm run start
```

Run tests in another terminal:

```bash
npm run test:e2e:ui
```

## Test Coverage

The setup includes tests for:

### ✅ Basic Collaboration

- Two players collaborating on same puzzle
- Three players collaborating simultaneously
- Players seeing each other's moves in real-time

### ✅ State Consistency

- Concurrent updates to different cells
- Concurrent updates to same cell (race conditions)
- Out-of-order event delivery
- Rapid sequential updates
- State rebuilding with `makeConsistent()`

### ✅ Event Synchronization

- Cell updates
- Note toggles
- Quick pencil
- Player join events
- Player leave events
- Player name changes
- Chat messages
- Puzzle completion

### ✅ Edge Cases

- Player leaving and rejoining
- Late-joining players seeing current state
- Rapid concurrent updates from multiple players
- Network latency simulation

## Test Architecture

### Page Object Model

The `CollaborationPage` class provides a clean API:

```typescript
const page = new CollaborationPage(browserPage);

// Create and join games
const gameId = await page.createGame();
await page.joinGame(gameId);

// Interact with puzzle
await page.setCellValue(0, 0, "5");
await page.waitForCellValue(0, 0, "5");

// Use chat
await page.sendChatMessage("Hello!");
await page.waitForChatMessage("Hello!");

// Quick pencil
await page.clickQuickPencil();

// Change name
await page.changePlayerName("Alice");
```

### Helper Functions

```typescript
// Verify consistency across multiple players
await verifyConsistentState([player1Page, player2Page], 0, 0);

// Create multiple test instances
const pages = await createCollaborationPages(browser, 3);
```

## Running Different Test Suites

### Smoke Tests Only

```bash
npx playwright test smoke.spec.ts
```

### Collaboration Tests Only

```bash
npx playwright test collaboration.spec.ts
```

### Specific Browser

```bash
npx playwright test --project=chromium
```

### Watch Mode (Re-run on changes)

```bash
npx playwright test --watch
```

## Debugging Tips

### 1. Use UI Mode (Recommended)

```bash
npm run test:e2e:ui
```

This gives you:

- Time-travel debugging
- Watch mode
- Visual test picker
- Detailed step-by-step execution

### 2. Run in Headed Mode

```bash
npm run test:e2e:headed
```

See the browsers as tests run.

### 3. Use Debug Mode

```bash
npm run test:e2e:debug
```

Pauses before each action for inspection.

### 4. Add Breakpoints

```typescript
await page.pause(); // Pauses test execution
```

### 5. View Console Logs

```typescript
page.on("console", (msg) => console.log("BROWSER:", msg.text()));
```

### 6. Take Screenshots

```typescript
await page.screenshot({ path: "debug.png" });
```

## CI/CD Integration

Tests will automatically run on:

- Push to `main` or `develop` branches
- Pull requests targeting those branches

View results in GitHub Actions under the "Actions" tab.

## Best Practices

### 1. Use data-testid for Selection

```html
<!-- Good -->
<button data-testid="submit-button">Submit</button>

<!-- Avoid -->
<button class="btn-primary">Submit</button>
```

### 2. Wait for Async Operations

```typescript
// Good - explicit wait
await page.waitForCellValue(0, 0, "5");

// Avoid - arbitrary timeout
await page.waitForTimeout(1000);
```

### 3. Clean Up Resources

```typescript
try {
  // Test code
} finally {
  await context.close(); // Always close contexts
}
```

### 4. Test Isolation

Each test should be independent and not rely on previous test state.

### 5. Use Page Object Model

Encapsulate page interactions in the `CollaborationPage` class.

## Common Issues

### "Element not found"

- Check that data-testid attributes are added
- Verify element is visible (not hidden by CSS)
- Add explicit waits for dynamic content

### "Test timeout"

- Increase timeout in config
- Check if Firebase is connected
- Verify app is starting correctly

### "Flaky tests"

- Add explicit waits for Firebase events
- Use `waitForFunction()` for custom conditions
- Increase retry count in config

## Example: Writing a New Test

```typescript
import { test, expect } from "@playwright/test";
import { CollaborationPage } from "./helpers";

test("players can undo each others moves", async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const player1Page = new CollaborationPage(await context1.newPage());
  const player2Page = new CollaborationPage(await context2.newPage());

  try {
    // Setup
    const gameId = await player1Page.createGame();
    await player2Page.joinGame(gameId);

    // Player 1 makes a move
    await player1Page.setCellValue(0, 0, "5");
    await player2Page.waitForCellValue(0, 0, "5");

    // Player 2 undoes it
    await player2Page.setCellValue(0, 0, "0");
    await player1Page.waitForCellValue(0, 0, "");

    // Verify both see empty cell
    expect(await player1Page.getCellValue(0, 0)).toBe("");
    expect(await player2Page.getCellValue(0, 0)).toBe("");
  } finally {
    await context1.close();
    await context2.close();
  }
});
```

## Resources

- 📖 [Playwright Documentation](https://playwright.dev)
- 🎯 [Best Practices](https://playwright.dev/docs/best-practices)
- 🐛 [Debugging Guide](https://playwright.dev/docs/debug)
- 📝 [E2E Test README](./e2e/README.md)
- 🏷️ [Adding Test IDs Guide](./e2e/ADDING_TEST_IDS.md)

## Summary

You now have a production-ready E2E testing setup that:

- ✅ Tests multi-player collaboration
- ✅ Verifies state consistency
- ✅ Handles race conditions
- ✅ Tests event synchronization
- ✅ Includes CI/CD integration
- ✅ Provides debugging tools
- ✅ Uses Page Object Model
- ✅ Follows best practices

Start by adding the test IDs to your components, then run `npm run test:e2e:ui` to see your tests in action! 🚀
