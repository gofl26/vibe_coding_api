import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

export default (db) => {
  router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "아이디와 비밀번호를 입력하세요." });
    try {
      const user = await db.get(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        username,
        password
      );
      if (!user)
        return res
          .status(401)
          .json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." });
      // 토큰 발급 (유효기간 1일)
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET || "secret",
        { expiresIn: "1d" }
      );
      res.json({ token });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  return router;
};
