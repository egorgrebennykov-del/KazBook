import axios from "axios";
import dotenv from "dotenv";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, "../.env") });

const API_KEY = process.env.ZYTE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SOURCE_URL =
  "https://www.flip.kz/catalog?subsection=1&filter-i101=1&filter-i104=1&filter-i106=1";

function parsePrice(value) {
  return Number.parseFloat(String(value ?? "").replace(/[^\d.]/g, ""));
}

async function updateDiscounts() {
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

  const discountedBooks = products
    .map((product) => {
      const price = parsePrice(product.price);
      const regularPrice = parsePrice(product.regularPrice);
      return {
        title: product.name ?? "",
        url: product.url ?? "",
        image: product.mainImage?.url ?? product.images?.[0]?.url ?? "",
        price,
        regularPrice,
        currency: product.currency ?? "KZT",
        discountPercent:
          Number.isFinite(price) && regularPrice > 0
            ? Math.round((1 - price / regularPrice) * 100)
            : 0,
        store: "flip.kz",
      };
    })
    .filter(
      (book) =>
        book.title &&
        book.url &&
        Number.isFinite(book.price) &&
        book.price > 0 &&
        Number.isFinite(book.regularPrice) &&
        book.regularPrice > book.price,
    );

  const snapshot = {
    updatedAt: new Date().toISOString(),
    products: discountedBooks,
  };

  const { data: row, error: selectError } = await supabase
    .from("discounts")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (selectError) throw selectError;

  const result = row
    ? await supabase
        .from("discounts")
        .update({ books: snapshot })
        .eq("id", row.id)
    : await supabase.from("discounts").insert({ books: snapshot });

  if (result.error) throw result.error;
  console.log(`Saved ${discountedBooks.length} discounted books to Supabase`);
}

updateDiscounts().catch((error) => {
  console.error("Failed to update discounted books:", error.message);
  process.exitCode = 1;
});
