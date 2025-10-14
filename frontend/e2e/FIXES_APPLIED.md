# Playwright Tests - Fixes Applied

## Summary

Fixed the "No unsolved puzzles" error and updated tests to properly interact with Sudoku cells.

## Root Causes Identified

### 1. `tryPopulateLocalUnsolvedStore()` Not Awaiting Async Operations

**File**: `src/app/services/firebase.service.ts`

**Problem**:

```typescript
// BEFORE (BROKEN):
difficulties.forEach(async (difficulty) => {
  // async operations...
});
```

The function used `forEach` with an `async` callback, which doesn't wait for async operations. The function returned immediately, leaving IndexedDB empty when tests tried to access puzzles.

**Solution**:

```typescript
// AFTER (FIXED):
await Promise.all(
  difficulties.map(async (difficulty) => {
    // async operations...
  }),
);
```

Changed to `Promise.all` with `map` to properly await all puzzle loading operations.

### 2. Tests Attempting to Modify Pre-filled Cells

**Problem**: Tests were trying to update cells that were part of the original puzzle (e.g., cell 0,0 which contains "1"). These cells cannot be modified.

**Solution**: Created helper functions to find empty cells and calculate valid values:

- `findEmptyCells(page, count)` - Finds empty cells (value 0 in original puzzle)
- `findValidValue(page, row, col)` - Calculates a valid number (1-9) that doesn't violate Sudoku rules (not in row, column, or 3x3 box)

### 3. Incorrect Text Matching in Chat

**Problem**: Test was looking for exact text "updated cell" but actual text includes player name and spacing.

**Solution**: Changed from `'text=/updated cell/'` to `'text=/updated/'` for more flexible matching.

## Files Modified

### 1. `/src/app/services/firebase.service.ts`

- Fixed `tryPopulateLocalUnsolvedStore()` to properly await async operations
- **Impact**: Critical fix - enables tests to run at all

### 2. `/e2e/collaboration.spec.ts`

- Added `findEmptyCells()` helper function
- Added `findValidValue()` helper function
- Updated `setCellValue()` to add delays for UI updates
- Updated `createGame()` to wait for puzzles to load (30s timeout)
- Updated first test to use helpers and find valid values
- Fixed chat message locator from `/updated cell/` to `/updated/`
- Added `.first()` to "joined the game" locators to handle multiple matches

**Status**: First test ("two players can collaborate") now passes ✅

**Remaining Work**: Other tests in the file need similar updates to use `findEmptyCells` and `findValidValue`.

### 3. `/e2e/TROUBLESHOOTING.md`

- Created comprehensive troubleshooting guide
- Documents the "No unsolved puzzles" error and solution
- Includes debugging tips and best practices

## Test Results

### Passing Tests ✅

- `smoke.spec.ts` - All tests pass
- `collaboration.spec.ts` - "two players can collaborate on the same puzzle" passes

### Tests Needing Updates ⚠️

The following tests need to be updated to use `findEmptyCells()` and `findValidValue()`:

- "three players can collaborate simultaneously"
- "handles concurrent updates to the same cell"
- "chat messages are synchronized between players"
- "quick pencil is synchronized between players"
- "player name changes are synchronized"
- "handles player leaving and rejoining"
- "state consistency after out-of-order event delivery"
- All tests in "Collaboration Edge Cases" describe block

## How to Apply Fixes to Remaining Tests

For each test that manipulates cells:

1. **Find empty cells**:

   ```typescript
   const emptyCells = await findEmptyCells(playerPage, numberOfCellsNeeded);
   ```

2. **Find valid values**:

   ```typescript
   const value = await findValidValue(playerPage, cell.row, cell.col);
   ```

3. **Use the helpers**:

   ```typescript
   await setCellValue(playerPage, cell.row, cell.col, value);
   await waitForCellValue(otherPlayerPage, cell.row, cell.col, value);
   ```

4. **Update expectations**:

   ```typescript
   // Use .trim() on text content
   expect(cellText?.trim()).toBe(expectedValue);

   // Use .first() for duplicate locators
   await expect(page.locator("text=/joined/").first()).toBeVisible();
   ```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test collaboration.spec.ts

# Run specific test
npx playwright test --grep="two players can collaborate"

# Run with headed browser (see what's happening)
npx playwright test --headed

# Debug mode
npx playwright test --debug
```

## Key Learnings

1. **Always await async operations** - `forEach` doesn't work with async/await
2. **Sudoku validation matters** - Can't just set any value in any cell
3. **Pre-filled cells can't be modified** - Tests must find empty cells
4. **Text matching needs flexibility** - Use regex and `.first()` when appropriate
5. **UI updates need time** - Add small delays after interactions (100ms)

## Next Steps

1. Update remaining collaboration tests with the helper functions
2. Consider creating a Page Object Model class to encapsulate these helpers
3. Add more comprehensive test data/fixtures for different puzzle scenarios
4. Consider adding data-testid attributes to chat messages for more reliable selection

## Related Documentation

- `/e2e/README.md` - General E2E testing guide
- `/e2e/ADDING_TEST_IDS.md` - Guide for adding test IDs to components
- `/e2e/TROUBLESHOOTING.md` - Troubleshooting common issues
