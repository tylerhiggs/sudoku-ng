import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  HostListener,
  input,
  linkedSignal,
  effect,
  output,
} from '@angular/core';
import { NumberButtonsComponent } from '../number-buttons/number-buttons.component';
import { SudokuControlsComponent } from '../sudoku-controls/sudoku-controls.component';

@Component({
  selector: 'app-sudoku-table',
  imports: [NumberButtonsComponent, SudokuControlsComponent],
  templateUrl: './sudoku-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SudokuTableComponent {
  readonly originalTable = input<number[][]>();
  readonly solvedTable = input<number[][]>();
  readonly table = input<number[][]>();
  readonly noteTable = input.required<boolean[][][]>();

  readonly updateTable = output<{ r: number; c: number; value: number }>();
  readonly toggleNoteTable = output<{
    r: number;
    c: number;
    value: number;
  }>();

  readonly noteMode = signal(false);

  readonly moveHistory = signal<
    Array<{
      r: number;
      c: number;
      value: number;
      note?: boolean;
      delete?: boolean;
    }>
  >([]);

  readonly highlightedCell = signal({ r: 0, c: 0 });

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    event.stopImmediatePropagation();
    if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.onUndo();
      return;
    }
    if (event.key === 'ArrowUp') {
      this.moveHighlightedCell(-1, 0);
      return;
    }
    if (event.key === 'ArrowDown') {
      this.moveHighlightedCell(1, 0);
      return;
    }
    if (event.key === 'ArrowLeft') {
      this.moveHighlightedCell(0, -1);
      return;
    }
    if (event.key === 'ArrowRight') {
      this.moveHighlightedCell(0, 1);
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      this.removeValue();
      return;
    }
    if (event.key === 'p') {
      this.noteMode.update((n) => !n);
      return;
    }
    this.enterValue(event.key);
  }

  readonly moveHighlightedCell = (rowOffset: number, colOffset: number) => {
    const { r, c } = this.highlightedCell();
    const newRow = (r + rowOffset + 9) % 9;
    const newCol = (c + colOffset + 9) % 9;
    this.highlightedCell.set({ r: newRow, c: newCol });
  };

  readonly numLeft = computed<number[]>(() => {
    return (
      this.table()
        ?.flat()
        ?.reduce((acc, entry) => {
          if (!entry) return acc;
          acc[entry - 1] = acc[entry - 1] - 1;
          return acc;
        }, Array(9).fill(9)) || []
    );
  });

  readonly highlightedCellValue = computed(() => {
    const { r, c } = this.highlightedCell();
    const table = this.table();
    if (!table) return 0;
    if (r === -1 && c === -1) return 0;
    return table[r][c];
  });

  readonly isSolved = computed(() => {
    return this.numLeft().every((num) => num === 0);
  });

  readonly toggleNoteMode = () => {
    this.noteMode.update((n) => !n);
  };

  readonly enterValue = (strValue: string) => {
    const { r: row, c: col } = this.highlightedCell();
    if (row === -1 || col === -1) {
      console.error('No cell is selected');
      return;
    }
    const value = Number(strValue);
    if (isNaN(value)) {
      console.error('Input is not a number');
      return;
    }
    if (value < 1 || value > 9) {
      console.error('Input is not between 1 and 9', value);
      return;
    }
    const originalTable = this.originalTable();
    if (!originalTable || originalTable[row][col] !== 0) {
      console.error('Cell is not empty');
      return;
    }
    const table = this.table();

    if (!table || !table[row].every((entry) => entry !== value)) {
      console.log('Value is in row');
      return;
    }
    if (!table || !table.every((r) => r[col] !== value)) {
      console.log('Value is in column');
      return;
    }
    if (this.noteMode()) {
      this.toggleNoteTable.emit({
        r: row,
        c: col,
        value: value - 1,
      });
      this.moveHistory.update((h) => {
        h.push({ r: row, c: col, value, note: true });
        return [...h];
      });
      return;
    }

    this.updateTable.emit({ r: row, c: col, value });

    this.moveHistory.update((h) => {
      h.push({ r: row, c: col, value });
      return [...h];
    });
  };

  readonly displayNote = (row: number, col: number, num: number) => {
    const table = this.table();
    const noteTable = this.noteTable();
    if (!table || !noteTable) return false;
    return (
      noteTable[row][col][num - 1] &&
      table[row].every((entry) => entry !== num) &&
      table.every((r) => r[col] !== num) &&
      !this.numInBox(row, col, num)
    );
  };

  readonly numInBox = (row: number, col: number, num: number) => {
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    const table = this.table();
    if (!table) return false;
    return table.every((r, i) => {
      return !r.every(
        (entry, j) =>
          entry !== num ||
          (i >= startRow &&
            i < startRow + 3 &&
            j >= startCol &&
            j < startCol + 3),
      );
    });
  };

  readonly removeValue = () => {
    const { r: row, c: col } = this.highlightedCell();
    if (row === -1 && col === -1) {
      console.error('No cell is selected');
      return;
    }
    if (this.originalTable() && this.originalTable()![row][col] !== 0) {
      console.error('Cell is not empty');
      return;
    }
    const table = this.table();
    if (!table) return;
    const currentValue = table[row][col];
    if (
      this.originalTable() &&
      this.originalTable()![row][col] === currentValue
    ) {
      console.error('Cell is already filled with the correct value');
      return;
    }
    this.updateTable.emit({ r: row, c: col, value: 0 });
    this.moveHistory.update((h) => {
      h.push({ r: row, c: col, value: currentValue, delete: true });
      return [...h];
    });
  };

  readonly onUndo = () => {
    const lastMove = this.moveHistory().pop();
    if (!lastMove) return;
    const { r, c, value, note, delete: del } = lastMove;
    if (del) {
      this.updateTable.emit({ r, c, value });
      return;
    }
    if (note) {
      this.toggleNoteTable.emit({ r, c, value: value - 1 });
      return;
    }
    this.updateTable.emit({ r, c, value: 0 });
  };

  readonly erase = () => {
    const { r, c } = this.highlightedCell();
    if (r === -1 && c === -1) return;
    if (this.originalTable() && this.originalTable()![r][c] !== 0) return;
    const noteTable = this.noteTable();
    if (!noteTable) return;
    const prev = this.highlightedCellValue();
    this.updateTable.emit({ r, c, value: 0 });
    if (prev)
      this.moveHistory.update((h) => {
        h.push({ r, c, value: prev, delete: true });
        return [...h];
      });
    noteTable[r][c].forEach((_, i) => {
      this.moveHistory.update((h) => {
        h.push({ r, c, value: i + 1, note: true, delete: true });
        return [...h];
      });
    });
  };

  readonly onFocus = (row: number, col: number) => {
    this.highlightedCell.set({ r: row, c: col });
  };

  readonly lightlyHighlighted = (row: number, col: number) => {
    const { r, c } = this.highlightedCell();
    if (r === -1 && c === -1) return false;
    if (r === row && c === col) return false;
    return r === row || c === col;
  };

  readonly lightBlueHighlighted = (row: number, col: number) => {
    const { r, c } = this.highlightedCell();
    if (r === -1 && c === -1) return false;
    if (r === row && c === col) return false;
    const table = this.table();
    if (!table) return false;
    return (
      this.highlightedCellValue() &&
      this.highlightedCellValue() === table[row][col]
    );
  };

  readonly noteHighlighted = (num: number) => {
    const { r, c } = this.highlightedCell();
    if (r === -1 && c === -1) return false;
    return this.highlightedCellValue() === num;
  };

  readonly errorCell = (row: number, col: number) => {
    const table = this.table();
    if (!table) return false;
    return (
      this.solvedTable() &&
      table[row][col] !== this.solvedTable()![row][col] &&
      table[row][col] !== 0
    );
  };

  readonly onNumberClick = (number: number) => {
    this.enterValue(String(number));
  };
}
