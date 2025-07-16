import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { google } from "googleapis";

const router = express.Router();

export default (db) => {
  // 플레이리스트 생성 (POST)
  router.post("/playList", authMiddleware, async (req, res) => {
    const { id, name, items } = req.body;
    const userId = req.user.userId;
    if ((!id && !name) || !Array.isArray(items))
      return res.status(400).json({ error: "id or name, and items(array) required" });
    try {
      let playlistId = id;
      // id가 없으면 신규 생성
      if (!playlistId) {
        const result = await db.run(
          "INSERT INTO playlists (user_id, name) VALUES (?, ?)",
          userId,
          name
        );
        playlistId = result.lastID;
      }
      // items 추가
      for (const item of items) {
        await db.run(
          "INSERT INTO playlist_items (playlist_id, user_id, video_id, title, thumbnail, channel_title) VALUES (?, ?, ?, ?, ?, ?)",
          playlistId,
          userId,
          item.videoId,
          item.title || null,
          item.thumbnail || null,
          item.channelTitle || null
        );
      }
      res.json({ success: true, playlistId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 플레이리스트 목록 조회 (GET)
  router.get("/playList", authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    try {
      const playlists = await db.all(
        "SELECT * FROM playlists WHERE user_id = ?",
        userId
      );
      for (const playlist of playlists) {
        const items = await db.all(
          "SELECT video_id, title, thumbnail, channel_title, added_at FROM playlist_items WHERE playlist_id = ? AND user_id = ?",
          playlist.id,
          userId
        );
        // video_id로 duration 조회
        if (items.length > 0) {
          const youtube = google.youtube({
            version: "v3",
            auth: process.env.YOUTUBE_API_KEY,
          });
          const videoIds = items.map((item) => item.video_id).filter(Boolean);
          let videoDetails = [];
          if (videoIds.length > 0) {
            const detailsRes = await youtube.videos.list({
              id: videoIds.join(","),
              part: "contentDetails",
            });
            videoDetails = detailsRes.data.items;
          }
          for (const item of items) {
            const detail = videoDetails.find((v) => v.id === item.video_id);
            item.duration = detail ? detail.contentDetails.duration : null;
          }
        }
        playlist.items = items;
      }
      res.json({ playlists });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
