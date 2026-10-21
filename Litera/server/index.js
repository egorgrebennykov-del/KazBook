import axios from "axios";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import https from "node:https";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { dedupeBooks } from "./dedupeBooks.js";
import { warmupImageModel } from "../utils/bookSimilarity.js";
import {
  decodeLibrariusImage,
  searchLibrarius,
  getLibrariusDetails,
} from "./librariusService.js";
import {
  decodeCarturestiImage,
  decodeUlyssesImage,
  decodeCarteameaImage,
  decodeBiblionImage,
} from "../utils/enhancedImageUrl.js";
import {
  searchCarturesti,
  getCarturestiDetails,
} from "./carturestiService.js";
import {
  searchUlysses,
  getUlyssesDetails,
  thumbToHighRes,
} from "./ulyssesService.js";
import {
  searchCarteamea,
  getCarteameaDetails,
} from "./carteameaService.js";
import {
  searchBiblion,
  getBiblionDetails,
} from "./biblionService.js";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.BOOK_COMPARE_PORT) || 3001;
const MAX_BODY_SIZE = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const IMAGE_CACHE_DIR = path.join(appDir, ".cache", "fast-enhanced-images");
const ALLOWED_IMAGE_HOSTS = new Set([
  "librarius.md",
  "www.librarius.md",
  "cdn.librarius.md",
  "carturesti.md",
  "www.carturesti.md",
  "ulysses.md",
  "www.ulysses.md",
  "carteamea.md",
  "www.carteamea.md",
  "biblion.md",
  "www.biblion.md",
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
    if (typeof value !== "string" || !value) return false;
    if (value.startsWith("/api/enhance-image?url=")) {
      const u = new URL(value, "http://localhost");
      const target = u.searchParams.get("url");
      return validImageUrl(target);
    }
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
      family: 4,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Connection: "close",
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false, keepAlive: false }),
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

function resolveOriginalImageUrl(sourceUrl) {
  if (!sourceUrl) return "";
  let target = sourceUrl;
  if (target.startsWith("/api/enhance-image?url=")) {
    try {
      target =
        new URL(target, "http://localhost").searchParams.get("url") || target;
    } catch {
      // ignore
    }
  }
  if (target.includes("librarius.md")) {
    target = decodeLibrariusImage(target) || target;
  } else if (target.includes("carturesti.md")) {
    target = decodeCarturestiImage(target);
  } else if (target.includes("ulysses.md")) {
    target = decodeUlyssesImage(target);
    if (thumbToHighRes.has(target)) {
      target = thumbToHighRes.get(target);
    }
  } else if (target.includes("carteamea.md")) {
    target = decodeCarteameaImage(target);
  } else if (target.includes("biblion.md")) {
    target = decodeBiblionImage(target);
  }
  return target;
}

async function getEnhancedImage(sourceUrl) {
  const targetUrl = resolveOriginalImageUrl(sourceUrl);
  const cacheKey = createHash("sha256")
    .update(`sharp-fast-v4:${targetUrl}`)
    .digest("hex");
  const cachePath = path.join(IMAGE_CACHE_DIR, `${cacheKey}.webp`);

  if (pendingImages.has(cacheKey)) return pendingImages.get(cacheKey);
  const task = (async () => {
    try {
      return await readFile(cachePath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    const original = await fetchSourceImage(targetUrl);
    // Smart upscale small covers with Lanczos3 to 800x1200 without degrading high-res covers
    const metadata = await sharp(original).metadata();
    let sharpPipeline = sharp(original, { limitInputPixels: 40000000 }).rotate();
    if ((metadata.width && metadata.width < 600) || (metadata.height && metadata.height < 900)) {
      sharpPipeline = sharpPipeline
        .resize({
          width: 800,
          height: 1200,
          fit: "inside",
          withoutEnlargement: false,
          kernel: sharp.kernel.lanczos3,
        })
        .sharpen({ sigma: 1.1, m1: 1.4, m2: 0.6 });
    }
    const enhanced = await sharpPipeline
      .modulate({ brightness: 1.02, saturation: 1.05 })
      .webp({ quality: 92, effort: 3 })
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
  if (req.method === "GET" && req.url?.startsWith("/api/search-librarius?")) {
    const q = new URL(req.url, "http://localhost").searchParams.get("q") ?? "";
    try {
      const products = await searchLibrarius(q);
      respond(res, 200, { products });
    } catch (error) {
      console.warn("Direct Librarius search error:", error.message);
      respond(res, 500, { error: error.message });
    }
    return;
  }
  if (req.method === "GET" && req.url?.startsWith("/api/search-carturesti?")) {
    const q = new URL(req.url, "http://localhost").searchParams.get("q") ?? "";
    try {
      const products = await searchCarturesti(q);
      respond(res, 200, { products });
    } catch (error) {
      console.warn("Direct Carturesti search error:", error.message);
      respond(res, 500, { error: error.message });
    }
    return;
  }
  if (req.method === "GET" && req.url?.startsWith("/api/search-ulysses?")) {
    const q = new URL(req.url, "http://localhost").searchParams.get("q") ?? "";
    try {
      const products = await searchUlysses(q);
      respond(res, 200, { products });
    } catch (error) {
      console.warn("Direct Ulysses search error:", error.message);
      respond(res, 500, { error: error.message });
    }
    return;
  }
  if (req.method === "GET" && req.url?.startsWith("/api/search-carteamea?")) {
    const q = new URL(req.url, "http://localhost").searchParams.get("q") ?? "";
    try {
      const products = await searchCarteamea(q);
      respond(res, 200, { products });
    } catch (error) {
      console.warn("Direct Carteamea search error:", error.message);
      respond(res, 500, { error: error.message });
    }
    return;
  }
  if (req.method === "GET" && req.url?.startsWith("/api/search-biblion?")) {
    const q = new URL(req.url, "http://localhost").searchParams.get("q") ?? "";
    try {
      const products = await searchBiblion(q);
      respond(res, 200, { products });
    } catch (error) {
      console.warn("Direct Biblion search error:", error.message);
      respond(res, 500, { error: error.message });
    }
    return;
  }
  if (req.method === "GET" && req.url?.startsWith("/api/search-all?")) {
    const q = new URL(req.url, "http://localhost").searchParams.get("q") ?? "";
    try {
      const [librarius, carturesti, ulysses, carteamea, biblion] =
        await Promise.all([
          searchLibrarius(q).catch(() => []),
          searchCarturesti(q).catch(() => []),
          searchUlysses(q).catch(() => []),
          searchCarteamea(q).catch(() => []),
          searchBiblion(q).catch(() => []),
        ]);
      respond(res, 200, { librarius, carturesti, ulysses, carteamea, biblion });
    } catch (error) {
      console.warn("Search-all error:", error.message);
      respond(res, 500, { error: error.message });
    }
    return;
  }
  if (req.method === "GET" && req.url?.startsWith("/api/book-details?")) {
    const bookUrl =
      new URL(req.url, "http://localhost").searchParams.get("url") ?? "";
    try {
      if (bookUrl.includes("librarius.md")) {
        const product = await getLibrariusDetails(bookUrl);
        respond(res, 200, { product });
        return;
      }
      if (bookUrl.includes("carturesti.md")) {
        const product = await getCarturestiDetails(bookUrl);
        respond(res, 200, { product });
        return;
      }
      if (bookUrl.includes("ulysses.md")) {
        const product = await getUlyssesDetails(bookUrl);
        respond(res, 200, { product });
        return;
      }
      if (bookUrl.includes("carteamea.md")) {
        const product = await getCarteameaDetails(bookUrl);
        respond(res, 200, { product });
        return;
      }
      if (bookUrl.includes("biblion.md")) {
        const product = await getBiblionDetails(bookUrl);
        respond(res, 200, { product });
        return;
      }
      respond(res, 400, { error: "Unsupported bookstore URL" });
    } catch (error) {
      console.warn("Direct book details error:", error.message);
      respond(res, 500, { error: error.message });
    }
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
