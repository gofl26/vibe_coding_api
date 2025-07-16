import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

// 토큰 유효성 검사 라우터
router.get("/validate", (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "토큰이 필요합니다." });
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "토큰이 필요합니다." });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.status(401).json({ valid: false, error: "유효하지 않은 토큰입니다." });
  }
});

export default router;
