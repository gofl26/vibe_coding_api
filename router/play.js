
import express from "express";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import os from "os";
import path from "path";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get("/play", async (req, res) => {
  const { id, token } = req.query;
  if (!id) return res.status(400).json({ error: "id required" });
  if (!token) return res.status(401).json({ error: "token required" });
  try {
    // 토큰 검증
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    } catch (err) {
      return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
    }

    // 임시 파일 경로 생성
    const tempFile = path.join(os.tmpdir(), `${uuidv4()}.mp3`);
    const ytUrl = `https://www.youtube.com/watch?v=${id}`;
    // yt-dlp로 파일 다운로드
    await new Promise((resolve, reject) => {
      const ytProcess = spawn("/root/.local/bin/yt-dlp", [
        "-f", "bestaudio",
        "-o", tempFile,
        ytUrl,
      ]);
      ytProcess.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error("yt-dlp 다운로드 실패"));
      });
      ytProcess.on("error", reject);
    });

    // Range 헤더 처리
    const stat = fs.statSync(tempFile);
    const range = req.headers.range;
    if (!range) {
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", stat.size);
      fs.createReadStream(tempFile)
        .pipe(res)
        .on("close", () => fs.unlink(tempFile, () => {}));
    } else {
      const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Length", chunkSize);
      res.setHeader("Content-Type", "audio/mpeg");
      fs.createReadStream(tempFile, { start, end })
        .pipe(res)
        .on("close", () => fs.unlink(tempFile, () => {}));
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
