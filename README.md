# [Sudoku](https://sudoku-6fbd2.web.app/)

* [./frontend](./frontend) is an Angular project that fetches sudoku puzzles from Firebase, stores them in the browser's indexedDB, and provides a UI in the browser for the user to play the puzzles. The built project is deployed to Firebase Hosting.
* [./sudoku-generator](./sudoku-generator) is a rust project that builds sudoku puzzles and their solutions. This generator is meant to run locally, creating puzzles that can be posted to the Firebase DB.
* [./sudoku-node](./sudoku-node) is a node server that takes in built projects from the rust sudoku generator and posts them to the Firebase DB. 
