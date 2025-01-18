use rand::{seq::SliceRandom, Rng};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

fn main() {
    println!("Hello, world!");
    let solved = create_solved_table();
    let mut table = solved.clone();
    print_table(&solved);
    remove_numbers(&mut table, 52);
    println!();
    print_table(&table);
    println!();
    println!("{}", hash_table(&table));
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

fn remove_numbers(table: &mut [[u8; 9]; 9], count: usize) {
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
    if removed == count {
        println!("Removed {} numbers in {} attempts", count, attempts);
        return true;
    } else {
        println!("Failed to remove {} numbers", count);
        return false;
    }
}

fn is_unique_solution(table: &[[u8; 9]; 9]) -> bool {
    let mut table_copy = table.clone();
    solve(&mut table_copy, 0, 0, 0) == 1
}

fn solve(table: &mut [[u8; 9]; 9], row: usize, col: usize, count: usize) -> usize {
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
                table[row][col] = 0;
                return new_count;
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
