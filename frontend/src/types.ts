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
