import express from "express";
import { initializeApp } from "firebase-admin/app";
const firebaseApp = initializeApp();
const app = express();
const port = 3000;

app.get("/", (_, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});
