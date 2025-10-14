export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface SudokuEntryFirebase {
  puzzle: number[];
  solution: number[];
  hash: string;
}

export interface SudokuEntryIndexedDb {
  puzzle: number[][];
  solution: number[][];
  hash: string;
  difficulty: Difficulty;
}

export interface PuzzleEvent {
  r: number;
  c: number;
  value: number;
  note?: boolean;
  delete?: boolean;
}

export interface AsyncPuzzleEvent extends PuzzleEvent {
  playerId: string;
  timestamp: number;
  playerName: string;
}
