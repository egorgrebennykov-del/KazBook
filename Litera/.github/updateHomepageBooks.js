import axios from "axios";
import dotenv from "dotenv";
import { env, pipeline } from "@huggingface/transformers";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, "../.env") });
env.cacheDir = path.resolve(
  scriptDir,
  "../node_modules/@huggingface/transformers/.cache/",
);

const API_KEY = process.env.ZYTE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SOURCE_URL =
  process.env.HOMEPAGE_SOURCE_URL ||
  "https://librarius.md/ru/books?sortBy=qty_desc&perPage=48&pb%5B%5D=215&pb%5B%5D=8&pb%5B%5D=192&pb%5B%5D=356&pb%5B%5D=4331&pb%5B%5D=362";
const DETAIL_BATCH_SIZE = 5;
const COVER_BATCH_SIZE = 4;
const BOOK_COUNT = 5;
const MIN_PRICE = 50;
const MIN_COVER_SCORE = 0.08;
const COVER_LABELS = [
  "a flat straight-on scan of one single book front cover only, artwork fills the image edge to edge, no visible spine, no background",
  "a 3D book mockup standing upright at an angle with a visible spine",
  "two or more books, front and back covers, or a stack of books",
  "a book cover photographed on a colored background with leaves, props, shadows, or a scene",
  "a bright colorful flat single front book cover design",
  "a dull faded low contrast book cover",
  "a blurry noisy low resolution book cover",
];
let classifierPromise;

function parsePrice(value) {
  return Number.parseFloat(String(value ?? "").replace(/[^\d.]/g, ""));
}

function highResolutionCover(url) {
  return url.replace(/_550(?=\.[a-z0-9]+(?:\?|$))/i, "_1000");
}

function readPublisher(product) {
  const property = (product.additionalProperties ?? []).find((item) =>
    /^(издательство|publisher)$/i.test(String(item.name ?? "").trim()),
  );
  return String(property?.value ?? product.brand?.name ?? "").trim();
}

function normalizePublisher(publisher) {
  return publisher
    .toLocaleLowerCase("ru-RU")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

async function scoreCover(book) {
  classifierPromise ??= pipeline(
    "zero-shot-image-classification",
    "Xenova/clip-vit-base-patch32",
  );
  const classifier = await classifierPromise;
  const highResolutionImage = highResolutionCover(book.image);
  let image = highResolutionImage;
  let predictions;
  try {
    predictions = await classifier(image, COVER_LABELS);
  } catch (error) {
    if (image === book.image) throw error;
    image = book.image;
    predictions = await classifier(image, COVER_LABELS);
  }
  const scores = new Map(predictions.map(({ label, score }) => [label, score]));
  const isolatedCoverScore = scores.get(COVER_LABELS[0]) ?? 0;
  const colorfulCoverScore = scores.get(COVER_LABELS[4]) ?? 0;
  const unwantedImageScore = [1, 2, 3, 5, 6].reduce(
    (total, index) => total + (scores.get(COVER_LABELS[index]) ?? 0),
    0,
  );
  return {
    image,
    isolatedCoverScore,
    unwantedImageScore,
    coverScore: isolatedCoverScore + colorfulCoverScore - unwantedImageScore,
  };
}

async function fetchDetails(url) {
  const response = await axios.post(
    "https://api.zyte.com/v1/extract",
    {
      url,
      product: true,
      productOptions: { extractFrom: "httpResponseBody", ai: true },
      followRedirect: true,
    },
    { auth: { username: API_KEY } },
  );
  return response.data.product;
}

async function scoreCandidates(candidates) {
  const scored = [];
  for (let offset = 0; offset < candidates.length; offset += COVER_BATCH_SIZE) {
    const batch = candidates.slice(offset, offset + COVER_BATCH_SIZE);
    const scores = await Promise.all(
      batch.map((book) =>
        scoreCover(book).catch((error) => {
          console.warn(`Could not score cover ${book.url}: ${error.message}`);
          return null;
        }),
      ),
    );
    batch.forEach((book, index) => {
      const visualScore = scores[index];
      if (
        visualScore &&
        visualScore.coverScore >= MIN_COVER_SCORE &&
        visualScore.isolatedCoverScore > visualScore.unwantedImageScore
      ) {
        scored.push({ ...book, ...visualScore });
      }
    });
  }
  return scored.sort(
    (a, b) => b.coverScore - a.coverScore || a.price - b.price,
  );
}

async function selectPublishers(books) {
  const selected = [];
  const publishers = new Set();
  const seenUrls = new Set();

  for (
    let offset = 0;
    offset < books.length && selected.length < BOOK_COUNT;
    offset += DETAIL_BATCH_SIZE
  ) {
    const batch = books.slice(offset, offset + DETAIL_BATCH_SIZE);
    const details = await Promise.all(
      batch.map(async (book) => {
        try {
          return await fetchDetails(book.url);
        } catch (error) {
          console.warn(`Could not inspect ${book.url}: ${error.message}`);
          return null;
        }
      }),
    );

    for (
      let index = 0;
      index < batch.length && selected.length < BOOK_COUNT;
      index++
    ) {
      const book = batch[index];
      const detail = details[index];
      const publisher = detail ? readPublisher(detail) : "";
      const publisherKey = normalizePublisher(publisher);
      if (
        !detail ||
        !publisherKey ||
        publishers.has(publisherKey) ||
        seenUrls.has(book.url)
      ) {
        continue;
      }

      publishers.add(publisherKey);
      seenUrls.add(book.url);
      selected.push({ ...book, publisher });
    }
  }

  if (selected.length < BOOK_COUNT) {
    for (const book of books) {
      if (selected.length >= BOOK_COUNT) break;
      if (!seenUrls.has(book.url)) {
        seenUrls.add(book.url);
        selected.push({ ...book, publisher: book.publisher || "librarius.md" });
      }
    }
  }

  if (selected.length === 0) {
    throw new Error(
      "No visually suitable books found for homepage",
    );
  }
  return selected;
}

async function updateHomepageBooks() {
  if (!API_KEY) throw new Error("ZYTE_API_KEY is not configured");
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error("SUPABASE_URL or SUPABASE_SECRET_KEY is not configured");
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });

  const response = await axios.post(
    "https://api.zyte.com/v1/extract",
    {
      url: SOURCE_URL,
      productList: true,
      productListOptions: { extractFrom: "httpResponseBody" },
      followRedirect: true,
    },
    { auth: { username: API_KEY } },
  );
  const products = response.data.productList?.products;
  if (!Array.isArray(products)) {
    throw new Error("Zyte did not return a product list");
  }

  const candidates = products
    .map((product) => ({
      title: product.name ?? "",
      url: product.url ?? "",
      image: product.mainImage?.url ?? product.images?.[0]?.url ?? "",
      price: parsePrice(product.price),
      currency: product.currency ?? "MDL",
      store: "librarius.md",
    }))
    .filter(
      (book) =>
        book.title &&
        book.url &&
        book.image &&
        Number.isFinite(book.price) &&
        book.price >= MIN_PRICE,
    );

  const visuallyScored = await scoreCandidates(candidates);
  const selected = await selectPublishers(visuallyScored);

  const { data: row, error: lookupError } = await supabase
    .from("books_on_home_page")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (lookupError) throw lookupError;

  const result = row
    ? await supabase
        .from("books_on_home_page")
        .update({ books: selected })
        .eq("id", row.id)
    : await supabase.from("books_on_home_page").insert({ books: selected });
  if (result.error) throw result.error;

  console.log(
    "Saved five visually ranked books from distinct publishers:",
    selected.map(
      (book) =>
        `${book.title} — ${book.publisher} — ${book.price} — visual ${book.coverScore.toFixed(3)}`,
    ),
  );
}

updateHomepageBooks().catch((error) => {
  console.error("Failed to update homepage books:", error.message);
  process.exitCode = 1;
});
