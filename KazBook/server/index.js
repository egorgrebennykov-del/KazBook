import { createServer } from "node:http";
import process from "node:process";
import { dedupeBooks } from "./dedupeBooks.js";
import { warmupImageModel } from "../utils/bookSimilarity.js";

const PORT = Number(process.env.BOOK_COMPARE_PORT) || 3001;
const MAX_BODY_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_HOSTS = new Set([
  "s.f.kz",
  "simg.marwin.kz",
  "www.bookcity.kz",
]);

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

const server = createServer(async (req, res) => {
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
