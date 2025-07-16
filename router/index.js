import express from "express";
import loginRouter from "./login.js";
import authRouter from "./auth.js";
import playListRouter from "./playList.js";
import searchRouter from "./search.js";
import playRouter from "./play.js";

export default (db) => {
  const router = express.Router();
  router.use(loginRouter(db));
  router.use(authRouter);
  router.use(playListRouter(db));
  router.use(searchRouter);
  router.use(playRouter);
  return router;
};
