import axios from "axios";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { dedupeBooks } from "./dedupeBooks.js";
import { warmupImageModel } from "../utils/bookSimilarity.js";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.BOOK_COMPARE_PORT) || 3001;
const MAX_BODY_SIZE = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const IMAGE_CACHE_DIR = path.join(appDir, ".cache", "fast-enhanced-images");
const ALLOWED_IMAGE_HOSTS = new Set([
  "s.f.kz",
  "simg.marwin.kz",
  "www.bookcity.kz",
]);
const pendingImages = new Map();

function respond(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_BODY_SIZE)
      throw new Error("Request body is too large");
  }
  return JSON.parse(body);
}

function validImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

async function fetchSourceImage(sourceUrl) {
  let currentUrl = sourceUrl;
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (!validImageUrl(currentUrl)) {
      throw new Error("Image redirect points to an unsupported host");
    }

    const response = await axios.get(currentUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
      maxContentLength: MAX_IMAGE_BYTES,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    if (response.status >= 300) {
      const location = response.headers.location;
      if (!location) throw new Error("Image redirect has no location");
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    const image = Buffer.from(response.data);
    if (!image.length || image.length > MAX_IMAGE_BYTES) {
      throw new Error("Image is empty or exceeds the size limit");
    }
    return image;
  }

  throw new Error("Image has too many redirects");
}

async function getEnhancedImage(sourceUrl) {
  const cacheKey = createHash("sha256")
    .update(`sharp-bright-sharp-v1:${sourceUrl}`)
    .digest("hex");
  const cachePath = path.join(IMAGE_CACHE_DIR, `${cacheKey}.webp`);

  if (pendingImages.has(cacheKey)) return pendingImages.get(cacheKey);
  const task = (async () => {
    try {
      return await readFile(cachePath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    const original = await fetchSourceImage(sourceUrl);
    const enhanced = await sharp(original, { limitInputPixels: 40000000 })
      .rotate()
      .resize({
        width: 1600,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .modulate({ brightness: 1.07, saturation: 1.04 })
      .sharpen({ sigma: 0.55 })
      .webp({ quality: 88, effort: 3 })
      .toBuffer();

    await mkdir(IMAGE_CACHE_DIR, { recursive: true });
    await writeFile(cachePath, enhanced);
    return enhanced;
  })();

  pendingImages.set(cacheKey, task);
  try {
    return await task;
  } finally {
    pendingImages.delete(cacheKey);
  }
}

async function handleEnhancedImage(req, res) {
  const sourceUrl = new URL(req.url, "http://localhost").searchParams.get(
    "url",
  );
  if (!sourceUrl || !validImageUrl(sourceUrl)) {
    respond(res, 400, { error: "Unsupported image URL" });
    return;
  }

  try {
    const image = await getEnhancedImage(sourceUrl);
    res.writeHead(200, {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    });
    res.end(image);
  } catch (error) {
    console.warn(`Could not enhance image ${sourceUrl}: ${error.message}`);
    respond(res, 502, { error: "Could not load image" });
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url?.startsWith("/api/enhance-image?")) {
    await handleEnhancedImage(req, res);
    return;
  }
  if (req.method === "GET" && req.url === "/health") {
    respond(res, 200, { ok: true });
    return;
  }
  if (req.method === "POST" && req.url === "/api/warmup") {
    try {
      await warmupImageModel();
      respond(res, 200, { ready: true });
    } catch (error) {
      console.error("Image model warmup failed:", error.message);
      respond(res, 503, { error: "Image model is unavailable" });
    }
    return;
  }
  if (req.method !== "POST" || req.url !== "/api/dedupe-books") {
    respond(res, 404, { error: "Not found" });
    return;
  }

  try {
    const body = await readJson(req);
    if (!Array.isArray(body.books) || body.books.length > 150) {
      respond(res, 400, { error: "Expected up to 150 books" });
      return;
    }
    if (
      body.books.some(
        (book) =>
          !book ||
          typeof book.title !== "string" ||
          typeof book.store !== "string" ||
          !validImageUrl(book.image),
      )
    ) {
      respond(res, 400, {
        error: "Books contain invalid image URLs or fields",
      });
      return;
    }

    const books = await dedupeBooks(body.books, String(body.query ?? ""));
    respond(res, 200, { books });
  } catch (error) {
    console.error("Book cover comparison failed:", error.message);
    respond(res, 500, { error: "Could not compare book covers" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Book cover comparison API listening on ${PORT}`);
});
