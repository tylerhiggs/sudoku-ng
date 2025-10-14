# Adding Test IDs to Components

To make the Playwright tests work, you need to add `data-testid` attributes to your components. Here's a guide for each component:

## 1. Sudoku Table Component (`sudoku-table.component.html`)

```html
<!-- Main table wrapper -->
<div data-testid="sudoku-table" class="sudoku-grid">
  <!-- Each cell -->
  @for (row of table(); let r = $index; track r) { @for (cell of row; let c = $index; track c) {
  <div [attr.data-testid]="'cell-' + r + '-' + c" [class.original]="isOriginal(r, c)" (click)="selectCell(r, c)">
    {{ cell || '' }}

    <!-- Cell notes if in note mode -->
    @if (noteMode() && noteTable()[r][c].some(n => n)) {
    <div [attr.data-testid]="'cell-' + r + '-' + c + '-notes'" class="notes">
      @for (note of noteTable()[r][c]; let i = $index) { @if (note) {
      <span>{{ i + 1 }}</span>
      } }
    </div>
    }
  </div>
  } }
</div>
```

## 2. Chat Component (`chat.component.html`)

```html
<div class="chat-container">
  <h2><input data-testid="player-name-input" [value]="newPlayerName()" (input)="onUpdatePlayerName($event)" />'s Chat</h2>

  <div id="chat-messages" class="chat-messages">
    <!-- Messages render here -->
  </div>

  <input data-testid="chat-input" [value]="newMessage()" (keydown)="keydown($event)" (input)="input($event)" type="text" placeholder="Type a message..." />
</div>
```

## 3. Sudoku Controls Component (`sudoku-controls.component.html`)

```html
<div class="controls">
  <!-- Note mode toggle -->
  <button data-testid="note-mode-toggle" (click)="toggleNoteMode()" [class.active]="noteMode()">Note Mode</button>

  <!-- Quick pencil -->
  <button data-testid="quick-pencil-button" (click)="quickPencil()">Quick Pencil ⚡️✏️</button>

  <!-- Clear cell -->
  <button data-testid="clear-cell-button" (click)="clearCell()">Clear</button>

  <!-- Undo -->
  <button data-testid="undo-button" (click)="undo()">Undo</button>

  <!-- Redo -->
  <button data-testid="redo-button" (click)="redo()">Redo</button>
</div>
```

## 4. Puzzle Nav Component (`puzzle-nav.component.html`)

```html
<div class="puzzle-nav">
  <!-- Time elapsed -->
  <div data-testid="time-elapsed" class="time">{{ formatTime(timeElapsed()) }}</div>

  <!-- Difficulty -->
  <div data-testid="difficulty" class="difficulty">{{ difficulty() }}</div>

  <!-- Reset button -->
  <button data-testid="reset-button" (click)="reset()">Reset</button>
</div>
```

## 5. Victory Dialog Component (`victory-dialog.component.html`)

```html
@if (isOpen()) {
<div data-testid="victory-dialog" class="victory-dialog">
  <div class="dialog-content">
    <h2>🎉 Puzzle Complete! 🎉</h2>

    <div data-testid="completion-time">Time: {{ formatTime(timeElapsed()) }}</div>

    <button data-testid="close-victory-dialog" (click)="close()">Close</button>

    <button data-testid="new-puzzle-button" (click)="newPuzzle()">New Puzzle</button>
  </div>
</div>
}
```

## 6. Home Component (`home.component.html`)

```html
<div class="home">
  <h1>Sudoku</h1>

  <!-- Start solo game -->
  <button data-testid="start-solo-game" (click)="startSolo()">Play Solo</button>

  <!-- Create collaboration game -->
  <button data-testid="create-collaboration-game" (click)="createCollaborationGame()">Play with Friends</button>

  <!-- Join game input -->
  <div class="join-game">
    <input data-testid="join-game-input" type="text" placeholder="Enter game code" [(ngModel)]="gameCode" />
    <button data-testid="join-game-button" (click)="joinGame()">Join Game</button>
  </div>
</div>
```

## 7. Number Buttons Component (`number-buttons.component.html`)

```html
<div class="number-buttons">
  @for (num of [1,2,3,4,5,6,7,8,9]; track num) {
  <button [attr.data-testid]="'number-button-' + num" (click)="selectNumber(num)" [disabled]="numLeft()[num] === 0">
    {{ num }}
    <span class="count">{{ numLeft()[num] }}</span>
  </button>
  }

  <!-- Delete/clear button -->
  <button data-testid="number-button-0" (click)="selectNumber(0)">Clear</button>
</div>
```

## 8. Collaborate Component (`collaborate.component.html`)

```html
<div class="collaborate-page">
  <!-- Share game link -->
  <div class="share-section">
    <input data-testid="share-link-input" [value]="shareLink()" readonly />
    <button data-testid="copy-link-button" (click)="copyLink()">Copy Link</button>
  </div>

  <!-- Game ID display -->
  <div data-testid="game-id" class="game-id">Game ID: {{ gameId() }}</div>

  <!-- Player count -->
  <div data-testid="player-count" class="player-count">Players: {{ playerCount() }}</div>

  <!-- Rest of the component -->
  <app-puzzle-nav [timeElapsed]="timeElapsed()" [difficulty]="difficulty()" (reset)="reset()" />

  <app-sudoku-table [table]="table()" [originalPuzzle]="originalPuzzle()" [noteTable]="noteTable()" [noteMode]="noteMode()" (cellUpdate)="updateTable($event)" (noteToggle)="toggleNoteTable($event)" />

  <app-sudoku-controls [noteMode]="noteMode()" (noteModeToggle)="toggleNoteMode()" (quickPencil)="quickPencil()" />

  <app-chat [events]="gameEvents()" [chats]="chatMessages()" [playerName]="playerName()" (updatePlayerName)="updatePlayerName($event)" (sendMessage)="sendMessage($event)" />

  <app-victory-dialog [isOpen]="isVictoryDialogOpen()" [timeElapsed]="timeElapsed()" (close)="victoryDialogClosed.set(true)" />
</div>
```

## Tips for Adding Test IDs

1. **Consistent Naming**: Use kebab-case for test IDs
2. **Descriptive Names**: Make test IDs self-explanatory
3. **Dynamic IDs**: For lists/grids, use attribute binding: `[attr.data-testid]="'cell-' + row + '-' + col"`
4. **State Variants**: Include state in ID if needed: `data-testid="save-button-disabled"`
5. **Avoid Duplicate IDs**: Each test ID should be unique on the page

## Verification

After adding test IDs, you can verify them in the browser DevTools:

```javascript
// Check if an element has the test ID
document.querySelector('[data-testid="cell-0-0"]');

// Get all test IDs on the page
Array.from(document.querySelectorAll("[data-testid]")).map((el) => el.dataset.testid);
```

## Running Tests After Adding IDs

Once you've added the test IDs:

1. Start your development server:

   ```bash
   npm run start
   ```

2. Run Playwright tests:

   ```bash
   npm run test:e2e
   ```

3. Or use UI mode for easier debugging:
   ```bash
   npm run test:e2e:ui
   ```
