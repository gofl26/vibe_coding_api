import express from "express";
import { google } from "googleapis";

const router = express.Router();

router.get("/search", async (req, res) => {
  const { query, page = 1, pageSize = 5 } = req.query;
  if (!query) return res.status(400).json({ error: "query required" });
  try {
    const youtube = google.youtube({
      version: "v3",
      auth: process.env.YOUTUBE_API_KEY,
    });
    let pageToken = undefined;
    for (let i = 1; i < Number(page); i++) {
      const temp = await youtube.search.list({
        q: query,
        part: "snippet",
        maxResults: Number(pageSize),
        type: "video",
        pageToken,
      });
      pageToken = temp.data.nextPageToken;
      if (!pageToken) break;
    }
    const result = await youtube.search.list({
      q: query,
      part: "snippet",
      maxResults: Number(pageSize),
      type: "video",
      pageToken,
    });
    // 영상 길이 조회 (Videos:list)
    const videoIds = result.data.items
      .map((item) => item.id.videoId)
      .filter(Boolean);
    let videoDetails = [];
    if (videoIds.length > 0) {
      const detailsRes = await youtube.videos.list({
        id: videoIds.join(","),
        part: "contentDetails",
      });
      videoDetails = detailsRes.data.items;
    }
    // 영상 길이 매칭 및 응답 (pageSize만큼 채워질 때까지 nextPageToken으로 반복)
    let itemsWithDuration = [];
    let nextPageToken = result.data.nextPageToken;
    let rawItems = result.data.items;
    while (itemsWithDuration.length < Number(pageSize) && rawItems.length > 0) {
      for (const item of rawItems) {
        if (!item.id.videoId) continue;
        const detail = videoDetails.find((v) => v.id === item.id.videoId);
        itemsWithDuration.push({
          ...item,
          duration: detail ? detail.contentDetails.duration : null,
        });
        if (itemsWithDuration.length >= Number(pageSize)) break;
      }
      // pageSize가 안 채워졌으면 다음 페이지 요청
      if (itemsWithDuration.length < Number(pageSize) && nextPageToken) {
        const nextResult = await youtube.search.list({
          q: query,
          part: "snippet",
          maxResults: Number(pageSize),
          type: "video",
          pageToken: nextPageToken,
        });
        nextPageToken = nextResult.data.nextPageToken;
        rawItems = nextResult.data.items;
        // 다음 페이지 videoDetails도 조회
        const nextVideoIds = rawItems
          .map((item) => item.id.videoId)
          .filter(Boolean);
        let nextVideoDetails = [];
        if (nextVideoIds.length > 0) {
          const detailsRes = await youtube.videos.list({
            id: nextVideoIds.join(","),
            part: "contentDetails",
          });
          nextVideoDetails = detailsRes.data.items;
        }
        videoDetails = nextVideoDetails;
      } else {
        break;
      }
    }
    // hasMore: 다음 페이지가 존재하는지 여부
    const hasMore = !!nextPageToken;
    res.json({
      items: itemsWithDuration,
      nextPageToken,
      hasMore,
      prevPageToken: result.data.prevPageToken,
      totalResults: result.data.pageInfo?.totalResults,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
