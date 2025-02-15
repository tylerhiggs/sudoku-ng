import express from "express";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { configDotenv } from "dotenv";

const BATCH_SIZE = 50;

configDotenv();
type Difficulty = "easy" | "medium" | "hard";

type SudokuEntry = {
  puzzle: number[][];
  solution: number[][];
  hash: number;
};
type SudokuData = {
  entries: SudokuEntry[];
};

const firebaseApp = initializeApp({
  credential: applicationDefault(),
  projectId: "sudoku-6fbd2",
});

const db = getFirestore(firebaseApp);
const app = express();
app.use(express.json());
const port = 6969;

app.get("/", (_, res) => {
  res.send("Hello World!");
});

/**
 * I want to add puzzles in groups of 50 with incremental indices starting at 0. I also want
 * to add puzzles hashes to another collection to keep track of the puzzles that have been added
 * so that no duplicates are added. This means the steps we need to take are:
 * 1. Parse the request body to get the puzzles (we can expect a group of 50 puzzles)
 * 2. For each puzzle, check if the hash exists in the hash collection
 * 3. If the hash does not exist, add the puzzle to the appropriate difficulty collection
 * 4. Add the hash to the hash collection
 * 5. Return a success message
 */
app.post("/:dif", async (req, res) => {
  if (!req.body) {
    console.error("Invalid request, body is undefined");
    console.log("body", req.body, "type", req.params.dif);
    res.status(400).send("Invalid request, body is undefined");
    return;
  }
  const body = req.body as SudokuData;

  if (!body.entries || body.entries.length !== BATCH_SIZE) {
    console.error(
      "Invalid request, entries is undefined or size not equal to 50"
    );
    console.log("body", req.body);
    res.status(400).send("Invalid request, entries is undefined or empty");
    return;
  }

  const difficulty = req.params.dif as Difficulty;

  if (!["easy", "medium", "hard", "expert"].includes(difficulty)) {
    console.error(
      "Invalid request, difficulty is not one of easy, medium, hard"
    );
    console.log("body", req.body);
    res
      .status(400)
      .send(
        "Invalid request, difficulty is not one of easy, medium, hard, expert"
      );
    return;
  }

  try {
    const batch = db.batch();
    const hashCollectionRef = db.collection(`hashes-${difficulty}`);
    const batchCollectionRef = db.collection(`batches-${difficulty}`);

    const snapshot = await batchCollectionRef.count().get();
    const nextKey = snapshot.data().count;
    console.log("nextKey", nextKey);
    console.log("difficulty", difficulty);

    for (const entry of body.entries) {
      const hashDocRef = hashCollectionRef.doc(entry.hash.toString());
      const hashDoc = await hashDocRef.get();
      if (!hashDoc.exists) {
        batch.set(hashDocRef, { hash: entry.hash });
        const docRef = batchCollectionRef.doc(
          `${nextKey.toString()}/puzzles/${entry.hash.toString()}`
        );
        const batchDocRef = batchCollectionRef.doc(nextKey.toString());
        batch.set(batchDocRef, { index: nextKey });
        batch.set(docRef, {
          ...entry,
          puzzle: entry.puzzle.flat(),
          solution: entry.solution.flat(),
        });
      }
    }

    await batch.commit();
    res.status(200).send("Entries added successfully");
  } catch (error) {
    console.error(error);
    console.log("body", req.body);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});
