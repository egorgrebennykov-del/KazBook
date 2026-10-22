import axios from "axios";
import dotenv from "dotenv";
import path from "node:path";
import process from "node:process";
import https from "node:https";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, "../.env") });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const API_KEY = process.env.ZYTE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SOURCE_URL =
  process.env.NEW_BOOKS_SOURCE_URL ||
  "https://librarius.md/ru/books?sortBy=create_date_desc&perPage=36&pb%5B%5D=215&pb%5B%5D=8&pb%5B%5D=192&pb%5B%5D=356&pb%5B%5D=4331&pb%5B%5D=362";

const httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: false });

function decodeHtmlEntities(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
}

function decodeLibrariusImage(url) {
  if (!url || typeof url !== "string") return "";
  let target = url;
  if (target.includes("/img/catalog/")) {
    target = target.replace("/img/catalog/", "/img/original/");
  }
  try {
    const match = target.match(/\/img\/\d+\/\d+\/(?:x)?([A-Za-z0-9_-]+)/);
    if (match) {
      let b64 = match[1].replace(/_e_/g, "=").replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4 !== 0) b64 += "=";
      const raw =
        typeof atob === "function"
          ? atob(b64)
          : globalThis.Buffer?.from(b64, "base64").toString("binary") ?? "";
      try {
        const decoded = decodeURIComponent(escape(raw));
        if (decoded.startsWith("http")) {
          return decoded
            .replace(/^http:/i, "https:")
            .replace("/img/catalog/", "/img/original/");
        }
      } catch {
        if (raw.startsWith("http")) {
          return raw
            .replace(/^http:/i, "https:")
            .replace("/img/catalog/", "/img/original/");
        }
      }
    }
  } catch {
    // Ignore decoding errors
  }
  return target.replace(/^http:\/\/cdn\./i, "https://cdn.");
}

function parsePrice(value) {
  return Number.parseFloat(String(value ?? "").replace(/[^\d.]/g, ""));
}

function parseLibrariusHtml(html) {
  const cards = html.split('<div class="anyproduct-card">').slice(1);
  const products = [];

  for (const card of cards) {
    const linkMatch = card.match(/<a\s+href="([^"]+)"/);
    const titleMatch = card.match(/<div class="card-title">([^<]+)<\/div>/);
    const priceMatch = card.match(/<div class="card-price">([^<]+)<\/div>/);
    const imgMatch = card.match(/<img[^>]+src="([^"]+)"/);

    if (linkMatch && titleMatch) {
      const url = linkMatch[1];
      const name = decodeHtmlEntities(titleMatch[1].trim());
      const price = priceMatch ? priceMatch[1] : "";
      const imgSrc = imgMatch ? imgMatch[1] : "";
      const fullImg = decodeLibrariusImage(imgSrc);

      products.push({
        url,
        name,
        price,
        mainImage: { url: fullImg },
        images: [{ url: fullImg }],
      });
    }
  }
  return products;
}

async function fetchProducts() {
  // 1. Try Zyte extraction
  if (API_KEY) {
    try {
      console.log(`Extracting from Zyte: ${SOURCE_URL}`);
      const response = await axios.post(
        "https://api.zyte.com/v1/extract",
        {
          url: SOURCE_URL,
          productList: true,
          productListOptions: { extractFrom: "httpResponseBody" },
          followRedirect: true,
        },
        {
          auth: { username: API_KEY },
          httpsAgent,
          timeout: 25000,
        },
      );
      const products = response.data.productList?.products;
      if (Array.isArray(products) && products.length > 0) {
        return products;
      }
    } catch (err) {
      console.warn("Zyte extraction error, falling back to direct HTML fetch:", err.message);
    }
  }

  // 2. Direct HTML fetch fallback
  console.log(`Direct fetch fallback: ${SOURCE_URL}`);
  const directResponse = await axios.get(SOURCE_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    httpsAgent,
    timeout: 15000,
  });

  return parseLibrariusHtml(directResponse.data);
}

async function updateNewBooks() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error("SUPABASE_URL or SUPABASE_SECRET_KEY is not configured");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });

  const rawProducts = await fetchProducts();
  if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
    throw new Error("No products returned from source URL");
  }

  const newBooks = rawProducts
    .map((product) => {
      const price = parsePrice(product.price);
      const regularPrice = parsePrice(product.regularPrice);
      const rawImage = product.mainImage?.url ?? product.images?.[0]?.url ?? "";
      const image = decodeLibrariusImage(rawImage) || rawImage;

      return {
        title: decodeHtmlEntities(product.name ?? product.title ?? ""),
        url: product.url ?? "",
        image,
        price,
        regularPrice: Number.isFinite(regularPrice) && regularPrice > 0 ? regularPrice : null,
        currency: product.currency ?? "MDL",
        author: decodeHtmlEntities(product.author ?? ""),
        store: "librarius.md",
      };
    })
    .filter(
      (book) =>
        book.title &&
        book.url &&
        book.image &&
        Number.isFinite(book.price) &&
        book.price > 0,
    );

  const snapshot = {
    updatedAt: new Date().toISOString(),
    products: newBooks,
  };

  const { data: row, error: selectError } = await supabase
    .from("new_books")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (selectError) throw selectError;

  const result = row
    ? await supabase
        .from("new_books")
        .update({ books: snapshot })
        .eq("id", row.id)
    : await supabase.from("new_books").insert({ books: snapshot });

  if (result.error) throw result.error;
  console.log(`Saved ${newBooks.length} new books to Supabase (new_books table)`);
}

updateNewBooks().catch((error) => {
  console.error("Failed to update new books:", error.message);
  process.exitCode = 1;
});
