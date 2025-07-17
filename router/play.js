import express from "express";
import { spawn } from "child_process";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/play", authMiddleware, async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "id required" });
  try {
    const ytUrl = `https://www.youtube.com/watch?v=${id}`;
    const ytProcess = spawn("/root/.local/bin/yt-dlp", [
      "-f",
      "bestaudio",
      "-o",
      "-",
      ytUrl,
    ]);
    res.setHeader("Content-Type", "audio/mpeg");
    ytProcess.stdout.pipe(res);
    ytProcess.stderr.on("data", (data) => {
      const msg = data.toString();
      if (
        msg.toLowerCase().includes("error") ||
        msg.toLowerCase().includes("failed")
      ) {
        console.error("yt-dlp error:", msg);
      }
    });
    ytProcess.on("error", (err) => {
      res.status(500).json({ error: "yt-dlp 실행 오류: " + err.message });
    });
    ytProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`yt-dlp 종료 코드: ${code}`);
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
