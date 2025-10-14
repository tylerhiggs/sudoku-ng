# E2E Testing with Playwright

This directory contains end-to-end tests for the Sudoku collaboration features using Playwright.

## Setup

1. Install dependencies:

```bash
bun install
```

2. Install Playwright browsers:

```bash
bun run playwright:install
```

## Running Tests

### Run all tests (headless):

```bash
bun run test:e2e
```

### Run tests with UI mode (recommended for development):

```bash
bun run test:e2e:ui
```

### Run tests in headed mode (see the browser):

```bash
bun run test:e2e:headed
```

### Debug tests:

```bash
bun run test:e2e:debug
```

### Run specific test file:

```bash
bunx playwright test e2e/collaboration.spec.ts
```

### Run tests in a specific browser:

```bash
bunx playwright test --project=chromium
bunx playwright test --project=firefox
bunx playwright test --project=webkit
```

## Test Structure

### `collaboration.spec.ts`

Main test file for collaboration features:

- Two players collaborating
- Three players collaborating
- Concurrent updates to same cell
- Chat synchronization
- Quick pencil synchronization
- Player name changes
- Player leaving/rejoining
- Out-of-order event handling
- Puzzle completion
- Rapid concurrent updates

### `fixtures.ts`

Test data and fixtures:

- Sample puzzles (easy, nearly solved)
- Test player names
- Firebase emulator config

### `helpers.ts`

Page Object Model and utility functions:

- `CollaborationPage` class for interacting with collaboration pages
- Helper functions for common operations
- Consistency verification utilities

## Writing New Tests

Use the `CollaborationPage` helper class for cleaner tests:

```typescript
import { test } from "@playwright/test";
import { CollaborationPage } from "./helpers";

test("my test", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const collabPage = new CollaborationPage(page);

  const gameId = await collabPage.createGame();
  await collabPage.setCellValue(0, 0, "5");
  await collabPage.sendChatMessage("Hello!");

  await context.close();
});
```

## Test Data

Add `data-testid` attributes to your components for reliable selection:

```html
<!-- Sudoku table -->
<div data-testid="sudoku-table">
  <div data-testid="cell-0-0">5</div>
  <!-- ... -->
</div>

<!-- Chat -->
<input data-testid="chat-input" />

<!-- Controls -->
<button data-testid="quick-pencil-button">Quick Pencil</button>
<button data-testid="note-mode-toggle">Note Mode</button>

<!-- Player name -->
<input data-testid="player-name-input" />

<!-- Create game -->
<button data-testid="create-collaboration-game">Create Game</button>

<!-- Victory dialog -->
<div data-testid="victory-dialog">Victory!</div>

<!-- Time -->
<div data-testid="time-elapsed">05:23</div>

<!-- Cell notes -->
<div data-testid="cell-0-0-notes">
  <span>1</span>
  <span>2</span>
  <!-- ... -->
</div>
```

## Key Testing Scenarios

### 1. State Consistency

- All players see the same puzzle state after updates
- Events applied in timestamp order
- Late-joining players receive full current state

### 2. Concurrent Updates

- Multiple players updating different cells simultaneously
- Multiple players updating the same cell
- Rapid sequential updates

### 3. Event Synchronization

- Cell updates
- Note toggles
- Quick pencil
- Player join/leave
- Name changes
- Chat messages
- Puzzle completion

### 4. Network Conditions

- Slow network
- Disconnection/reconnection
- Out-of-order event delivery

## Debugging

### View test trace:

After a test failure, open the HTML report:

```bash
npx playwright show-report
```

### Use Playwright Inspector:

```bash
npm run test:e2e:debug
```

### Add debug pauses in tests:

```typescript
await page.pause();
```

### Console logs:

```ts
page.on("console", (msg) => console.log("BROWSER:", msg.text()));
```

## CI/CD

Tests run automatically on:

- Push to `main` or `develop` branches
- Pull requests

See `.github/workflows/playwright.yml` for configuration.

## Tips

1. **Wait for animations**: If elements are animated, use `waitForTimeout()` sparingly
2. **Use data-testid**: More reliable than CSS selectors
3. **Test isolation**: Each test should be independent
4. **Clean up**: Always close browser contexts in `finally` blocks
5. **Timeouts**: Adjust timeouts for slower CI environments

## Troubleshooting

### Tests timing out

- Increase timeout in `playwright.config.ts`
- Check if app is starting correctly
- Verify Firebase connection

### Flaky tests

- Add explicit waits for async operations
- Use `waitForFunction()` for custom conditions
- Increase retry count in config

### Can't find elements

- Check data-testid attributes are present
- Verify element is visible (not hidden by CSS)
- Use `page.screenshot()` to debug

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
