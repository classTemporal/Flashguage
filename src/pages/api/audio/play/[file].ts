import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", ["GET", "HEAD"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { file } = req.query;
  const fileName = Array.isArray(file) ? file[0] : file;

  if (!fileName || typeof fileName !== "string") {
    return res.status(400).json({ message: "File name is required" });
  }

  // Prevent path traversal
  const sanitized = path.basename(fileName);
  if (!/^[a-zA-Z0-9_\-.]+\.(mp3|wav|ogg|webm)$/.test(sanitized)) {
    return res.status(400).json({ message: "Invalid file name or unsupported audio format" });
  }

  const cacheDir = path.join(process.cwd(), "public", "audio-cache");
  const filePath = path.join(cacheDir, sanitized);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Audio file not found or expired" });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  let contentType = "audio/mpeg";
  if (sanitized.endsWith(".wav")) contentType = "audio/wav";
  else if (sanitized.endsWith(".ogg")) contentType = "audio/ogg";
  else if (sanitized.endsWith(".webm")) contentType = "audio/webm";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      res.setHeader("Content-Range", `bytes */${fileSize}`);
      return res.status(416).end();
    }

    const chunksize = end - start + 1;
    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    res.setHeader("Content-Length", chunksize);
    res.status(206);

    if (req.method === "HEAD") {
      return res.end();
    }

    const fileStream = fs.createReadStream(filePath, { start, end });
    fileStream.pipe(res);
  } else {
    res.setHeader("Content-Length", fileSize);
    res.status(200);

    if (req.method === "HEAD") {
      return res.end();
    }

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
}
