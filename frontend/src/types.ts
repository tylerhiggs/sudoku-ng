export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type SudokuEntryFirebase = {
  puzzle: number[];
  solution: number[];
  hash: string;
};

export type SudokuEntryIndexedDb = {
  puzzle: number[][];
  solution: number[][];
  hash: string;
  difficulty: Difficulty;
};
