# Sudoku Node Server

This is a Node.js server for a Sudoku application.

## Prerequisites

- Node.js (v20 or higher)
- npm (v10 or higher)

## Installation

Install dependencies:

```sh
npm install
```

## Running the Server

You will need to have a firebase project setup and the credentials for firebase admin SDK in a `.json` file in the root directory of this node project. In the terminal, run something like:

```sh
export GOOGLE_APPLICATION_CREDENTIALS="/Users/tylerhiggs/Desktop/Class information/Personal Projects/sudoku-ng/sudoku-node/sudoku-6fbd2-firebase-adminsdk-fbsvc-d7ee4079bf.json"
```

where you replace the path with the path to your credentials file.

To start the server, run:

```sh
npm run start
```

The server will start on `http://localhost:6969`.

## Testing

To run tests, use:

```sh
npm test
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Contact

For any inquiries, please contact [thiggs911@gmail.com](mailto:thiggs911@gmail.com).
