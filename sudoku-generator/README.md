# Sudoku Generator

This project is a Sudoku puzzle generator written in Rust. It is a Cargo project that allows you to generate Sudoku puzzles of varying difficulty levels.

## Features

- Generate Sudoku puzzles
- Specify difficulty levels
- Output puzzles in a human-readable format

## Installation

To use this project, you need to have Rust and Cargo installed. You can install Rust and Cargo by following the instructions on the [official Rust website](https://www.rust-lang.org/).

Build the project:

```sh
cargo build --release
```

## Usage

To generate Sudoku puzzles, run the following command with http://localhost:6969/ port running the node server [see README](../sudoku-node/README.md):

```sh
cargo run --release
```

You can specify the difficulty level and number of puzzles to generate by passing an argument:

```sh
cargo run --release -- easy 100
cargo run --release -- medium 50
cargo run --release -- hard 30
cargo run --release -- expert 10
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For any questions or suggestions, please contact [thiggs911@gmail.com](mailto:thiggs911@gmail.com).
