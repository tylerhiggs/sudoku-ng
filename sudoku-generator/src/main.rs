use rand::{seq::SliceRandom, Rng};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use tokio;

const HOLES_EXPERT: usize = 56;
const HOLES_HARD: usize = 52;
const HOLES_MEDIUM: usize = 40;
const HOLES_EASY: usize = 32;

fn main() {
    // console input
    let args: Vec<String> = std::env::args().collect();
    let difficulty = if args.len() > 1 {
        args[1].as_str()
    } else {
        "hard"
    };
    let holes = match difficulty {
        "expert" => HOLES_EXPERT,
        "hard" => HOLES_HARD,
        "medium" => HOLES_MEDIUM,
        "easy" => HOLES_EASY,
        _ => HOLES_HARD,
    };
    let num_puzzles = if args.len() > 2 {
        args[2].parse::<usize>().unwrap()
    } else {
        1
    };
    let mut entries = Vec::new();
    while num_puzzles - entries.len() > 0 {
        for _ in 0..(num_puzzles - entries.len()) {
            let solved = create_solved_table();
            let mut table = solved.clone();
            print_table(&solved);
            let success = remove_numbers(&mut table, holes);
            if !success {
                println!("Failed to remove numbers!");
                continue;
            }
            println!();
            print_table(&table);
            println!();
            println!("{}", hash_table(&table));

            entries.push(SudokuEntry {
                puzzle: table,
                solution: solved,
                hash: hash_table(&table),
            });
        }
    }

    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        send_sudoku_data(SudokuData { entries }, difficulty)
            .await
            .unwrap();
    });

    println!("Done!");
}

fn create_solved_table() -> [[u8; 9]; 9] {
    let mut table = [[0; 9]; 9];
    fill_table(&mut table);
    table
}

fn fill_table(table: &mut [[u8; 9]; 9]) -> bool {
    let mut nums: Vec<u8> = (1..=9).collect();
    for i in 0..9 {
        for j in 0..9 {
            if table[i][j] == 0 {
                nums.shuffle(&mut rand::thread_rng());
                for &num in &nums {
                    if is_safe(table, i, j, num) {
                        table[i][j] = num;
                        if fill_table(table) {
                            return true;
                        }
                        table[i][j] = 0;
                    }
                }
                return false;
            }
        }
    }
    true
}

fn is_safe(table: &[[u8; 9]; 9], row: usize, col: usize, num: u8) -> bool {
    !used_in_row(table, row, num)
        && !used_in_col(table, col, num)
        && !used_in_box(table, row - (row % 3), col - (col % 3), num)
}

fn used_in_row(table: &[[u8; 9]; 9], row: usize, num: u8) -> bool {
    table[row].contains(&num)
}

fn used_in_col(table: &[[u8; 9]; 9], col: usize, num: u8) -> bool {
    table.iter().any(|&r| r[col] == num)
}

fn used_in_box(table: &[[u8; 9]; 9], box_start_row: usize, box_start_col: usize, num: u8) -> bool {
    for i in 0..3 {
        for j in 0..3 {
            if table[i + box_start_row][j + box_start_col] == num {
                return true;
            }
        }
    }
    false
}

fn remove_numbers(table: &mut [[u8; 9]; 9], count: usize) -> bool {
    let mut rng = rand::thread_rng();
    let mut attempts = 0;
    let mut removed = 0;

    while removed < count && attempts < count * 2 {
        let row = rng.gen_range(0..9);
        let col = rng.gen_range(0..9);

        if table[row][col] != 0 {
            let backup = table[row][col];
            table[row][col] = 0;

            if is_unique_solution(table) {
                removed += 1;
            } else {
                table[row][col] = backup;
            }
        }
        attempts += 1;
    }
    return removed == count;
}

fn is_unique_solution(table: &[[u8; 9]; 9]) -> bool {
    let mut table_copy = table.clone();
    solve(&mut table_copy, 0, 0, 0) == 1
}

fn solve(table: &mut [[u8; 9]; 9], row: usize, col: usize, mut count: usize) -> usize {
    if row == 9 {
        return count + 1;
    }

    if col == 9 {
        return solve(table, row + 1, 0, count);
    }

    if table[row][col] != 0 {
        return solve(table, row, col + 1, count);
    }

    let mut nums: Vec<u8> = (1..=9).collect();
    nums.shuffle(&mut rand::thread_rng());

    for &num in &nums {
        if is_safe(table, row, col, num) {
            table[row][col] = num;
            let new_count = solve(table, row, col + 1, count);
            if new_count > count {
                count = new_count;
                if count > 1 {
                    return count;
                }
            }
            table[row][col] = 0;
        }
    }

    count
}

fn print_table(table: &[[u8; 9]; 9]) {
    for i in 0..9 {
        for j in 0..9 {
            print!(
                "{} ",
                if table[i][j] != 0 {
                    table[i][j].to_string()
                } else {
                    ".".to_string()
                }
            );
        }
        println!();
    }
}

fn hash_table(table: &[[u8; 9]; 9]) -> u64 {
    let mut hasher = DefaultHasher::new();
    table.hash(&mut hasher);
    hasher.finish()
}

#[derive(serde::Serialize)]
struct SudokuEntry {
    puzzle: [[u8; 9]; 9],
    solution: [[u8; 9]; 9],
    hash: u64,
}

#[derive(serde::Serialize)]
struct SudokuData {
    entries: Vec<SudokuEntry>,
}

async fn send_sudoku_data(
    entries: SudokuData,
    difficulty: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let res = client
        .post(&format!("http://localhost:6969/{}", difficulty))
        .header("Content-Type", "application/json")
        .json(&entries)
        .send()
        .await?;

    if res.status().is_success() {
        println!("Data sent successfully!");
    } else {
        println!(
            "Failed to send data: {} - {}",
            res.status(),
            res.text().await?
        );
    }

    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_solve_unique_solution() {
        let mut table = [
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
        assert_eq!(solve(&mut table, 0, 0, 0), 1);
    }

    #[test]
    fn test_solve_multiple_solutions() {
        let mut table = [
            [5, 3, 0, 0, 7, 0, 0, 0, 0],
            [6, 0, 0, 1, 9, 5, 0, 0, 0],
            [0, 9, 8, 0, 0, 0, 0, 6, 0],
            [8, 0, 0, 0, 6, 0, 0, 0, 3],
            [4, 0, 0, 8, 0, 3, 0, 0, 1],
            [7, 0, 0, 0, 2, 0, 0, 0, 6],
            [0, 6, 0, 0, 0, 0, 2, 8, 0],
            [0, 0, 0, 4, 1, 9, 0, 0, 5],
            [0, 0, 0, 0, 8, 0, 0, 0, 0],
        ];
        table[8][8] = 0; // Make the puzzle have multiple solutions
        assert!(solve(&mut table, 0, 0, 0) > 1);
    }

    #[test]
    fn test_solve_no_solution() {
        let mut table = [
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
        table[0][0] = 9; // Make the puzzle unsolvable
        assert_eq!(solve(&mut table, 0, 0, 0), 0);
    }
}
