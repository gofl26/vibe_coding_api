
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import initDb from "./router/initDb.js";
import router from "./router/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT | 3000;
app.use(cors());
app.use(bodyParser.json());

let db;
initDb().then((_db) => {
  db = _db;
  app.use("/api", router(db));
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
