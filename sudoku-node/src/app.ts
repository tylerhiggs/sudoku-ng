import express from "express";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { configDotenv } from "dotenv";

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

app.post("/:dif", async (req, res) => {
  if (!req.body) {
    console.error("Invalid request, body is undefined");
    console.log("body", req.body, "type", req.params.dif);
    res.status(400).send("Invalid request, body is undefined");
    return;
  }
  const body = req.body as SudokuData;
  try {
    const difficulty = req.params.dif as Difficulty;
    const batch = db.batch();
    const collectionRef = db.collection(difficulty);

    body.entries.forEach((entry) => {
      const docRef = collectionRef.doc(entry.hash.toString());
      batch.set(docRef, {
        ...entry,
        puzzle: entry.puzzle.flat(),
        solution: entry.solution.flat(),
      });
    });

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
