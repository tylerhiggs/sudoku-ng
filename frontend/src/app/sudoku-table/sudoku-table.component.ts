import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  HostListener,
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
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    event.stopImmediatePropagation();
    if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
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

  readonly solvedTable = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
  ];

  readonly originalTable = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9],
  ];

  readonly table = signal([...this.originalTable.map((row) => [...row])]);
  readonly noteMode = signal(false);
  readonly noteTable = signal<Array<Array<Array<boolean>>>>(
    this.originalTable.map((row) => row.map(() => Array(9).fill(false))),
  );

  readonly moveHistory = signal<
    Array<{
      r: number;
      c: number;
      value: number;
      note?: boolean;
      delete?: boolean;
    }>
  >([]);

  readonly numLeft = computed<number[]>(() => {
    return this.table()
      .flat()
      .reduce((acc, entry) => {
        if (!entry) return acc;
        acc[entry - 1] = acc[entry - 1] - 1;
        return acc;
      }, Array(9).fill(9));
  });

  readonly highlightedCell = signal({ r: -1, c: -1 });

  readonly highlightedCellValue = computed(() => {
    const { r, c } = this.highlightedCell();
    if (r === -1 && c === -1) return 0;
    return this.table()[r][c];
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
    if (this.originalTable[row][col] !== 0) {
      console.error('Cell is not empty');
      return;
    }

    if (!this.table()[row].every((entry) => entry !== value)) {
      console.log('Value is in row');
      return;
    }
    if (!this.table().every((r) => r[col] !== value)) {
      console.log('Value is in column');
      return;
    }
    if (this.noteMode()) {
      this.noteTable.update((t) => {
        t[row][col][value - 1] = !t[row][col][value - 1];
        return [...t];
      });
      this.moveHistory.update((h) => {
        h.push({ r: row, c: col, value, note: true });
        return [...h];
      });
      return;
    }
    this.table.update((t) => {
      t[row][col] = value;
      return [...t];
    });
    this.moveHistory.update((h) => {
      h.push({ r: row, c: col, value });
      return [...h];
    });
  };

  readonly displayNote = (row: number, col: number, num: number) => {
    return (
      this.noteTable()[row][col][num - 1] &&
      this.table()[row].every((entry) => entry !== num) &&
      this.table().every((r) => r[col] !== num)
    );
  };

  readonly removeValue = () => {
    const { r: row, c: col } = this.highlightedCell();
    if (row === -1 && col === -1) {
      console.error('No cell is selected');
      return;
    }
    if (this.originalTable[row][col] !== 0) {
      console.error('Cell is not empty');
      return;
    }
    const currentValue = this.table()[row][col];
    if (this.originalTable[row][col] === currentValue) {
      console.error('Cell is already filled with the correct value');
      return;
    }
    this.table.update((t) => {
      t[row][col] = 0;
      return [...t];
    });
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
      this.table.update((t) => {
        t[r][c] = value;
        return [...t];
      });
      return;
    }
    if (note) {
      this.noteTable.update((t) => {
        t[r][c][value - 1] = !t[r][c][value - 1];
        return [...t];
      });
      return;
    }
    this.table.update((t) => {
      t[r][c] = 0;
      return [...t];
    });
  };

  readonly erase = () => {
    const { r, c } = this.highlightedCell();
    if (r === -1 && c === -1) return;
    if (this.originalTable[r][c] !== 0) return;
    const prev = this.highlightedCellValue();
    this.table.update((t) => {
      t[r][c] = 0;
      return [...t];
    });
    if (prev)
      this.moveHistory.update((h) => {
        h.push({ r, c, value: prev, delete: true });
        return [...h];
      });
    this.noteTable()[r][c].forEach((_, i) => {
      this.moveHistory.update((h) => {
        h.push({ r, c, value: i + 1, note: true, delete: true });
        return [...h];
      });
    });
    this.noteTable.update((t) => {
      t[r][c] = Array(9).fill(false);
      return [...t];
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
    return (
      this.highlightedCellValue() &&
      this.highlightedCellValue() === this.table()[row][col]
    );
  };

  readonly noteHighlighted = (num: number) => {
    const { r, c } = this.highlightedCell();
    if (r === -1 && c === -1) return false;
    return this.highlightedCellValue() === num;
  };

  readonly errorCell = (row: number, col: number) => {
    return (
      this.table()[row][col] !== this.solvedTable[row][col] &&
      this.table()[row][col] !== 0
    );
  };

  readonly onNumberClick = (number: number) => {
    this.enterValue(String(number));
  };
}
