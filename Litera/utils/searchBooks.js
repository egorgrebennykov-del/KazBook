import getBooksFromLibrarius from "./getBooksFromLibrarius.js";
import getBooksFromCarturesti from "./getBooksFromCarturesti.js";
import getBooksFromUlysses from "./getBooksFromUlysses.js";
import getExchangeRate from "./getExchangeRate.js";
import dedupeBooks from "./dedupeBooks.js";
import enhancedImageUrl from "./enhancedImageUrl.js";
import decodeHtmlEntities from "./decodeHtmlEntities.js";

function normalize(product, store, rate) {
  const mdl = Number.parseFloat(
    String(product.price ?? "").replace(/[^\d.]/g, ""),
  );
  const inEur = rate && !Number.isNaN(mdl);
  const rawImage = product.mainImage?.url ?? product.images?.[0]?.url ?? "";
  const image = enhancedImageUrl(rawImage) || rawImage;
  return {
    title: decodeHtmlEntities(product.name ?? ""),
    price: inEur ? Math.round((mdl / rate) * 100) / 100 : mdl,
    currency: rate ? "EUR" : "MDL",
    url: product.url ?? "",
    image,
    store,
    author: decodeHtmlEntities(product.author || ""),
  };
}

const tokenize = (s) => (s || "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

function splitTitle(title) {
  const colon = title.indexOf(":");
  if (colon > 0) return [title.slice(0, colon), title.slice(colon + 1), true];
  const sentence = title.match(/^.*?\p{L}{3,}\./u);
  if (sentence) return [sentence[0], title.slice(sentence[0].length), true];
  return [title.split(/\s+/).slice(0, 3).join(" "), title, false];
}

function calculateRelevance(title, query, author = "") {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 1;
  const titleTokens = tokenize(title);
  if (titleTokens.length === 0) return 0;

  const queryPhrase = queryTokens.join(" ");
  const titlePhrase = titleTokens.join(" ");

  // Exact phrase match
  if (titlePhrase === queryPhrase) return 100;
  if (titlePhrase.startsWith(queryPhrase + " ")) return 80;
  if ((" " + titlePhrase + " ").includes(" " + queryPhrase + " ")) return 60;

  // Author match
  if (author) {
    const authorTokens = tokenize(author);
    const authorPhrase = authorTokens.join(" ");
    if (authorPhrase === queryPhrase) return 70;
    if ((" " + authorPhrase + " ").includes(" " + queryPhrase + " ")) return 55;
    if (queryTokens.every((w) => authorTokens.includes(w))) return 50;
  }

  // Split title author / work checks
  const [splitAuthor, work, hasAuthor] = splitTitle(title);
  if (tokenize(work).join(" ") === queryPhrase) return 75;
  if (
    hasAuthor &&
    (" " + tokenize(work).join(" ") + " ").includes(" " + queryPhrase + " ")
  ) {
    return 55;
  }
  if (queryTokens.every((w) => splitAuthor.toLowerCase().includes(w))) {
    return 45;
  }

  // Token overlap ratio
  const titleSet = new Set(titleTokens);
  const matchedTokens = queryTokens.filter((w) => titleSet.has(w)).length;
  const tokenRatio = matchedTokens / queryTokens.length;

  if (tokenRatio === 1) return 40;
  if (tokenRatio > 0.5) return Math.round(20 * tokenRatio);
  if (tokenRatio > 0) return Math.round(10 * tokenRatio);
  return 0;
}

export default async function searchBooks(searchBook) {
  // Query all three bookstores and the exchange rate concurrently in parallel
  const [librariusRaw, carturestiRaw, ulyssesRaw, rate] = await Promise.all([
    getBooksFromLibrarius(searchBook).catch((err) => {
      console.warn("Librarius search failed:", err.message);
      return [];
    }),
    getBooksFromCarturesti(searchBook).catch((err) => {
      console.warn("Carturesti search failed:", err.message);
      return [];
    }),
    getBooksFromUlysses(searchBook).catch((err) => {
      console.warn("Ulysses search failed:", err.message);
      return [];
    }),
    getExchangeRate().catch(() => null),
  ]);

  const librariusBooks = (librariusRaw ?? []).map((p) =>
    normalize(p, "librarius.md", rate),
  );
  const carturestiBooks = (carturestiRaw ?? []).map((p) =>
    normalize(p, "carturesti.md", rate),
  );
  const ulyssesBooks = (ulyssesRaw ?? []).map((p) =>
    normalize(p, "ulysses.md", rate),
  );

  const combined = [...librariusBooks, ...carturestiBooks, ...ulyssesBooks].filter(
    (b) => b.title && b.url && Number.isFinite(b.price) && b.price > 0,
  );

  // Deduplicate: if books have identical covers/titles across different stores, keep the cheaper one
  const deduped = await dedupeBooks(combined, searchBook);

  // Compute relevance for sorting
  const withRelevance = deduped.map((b) => ({
    ...b,
    relevance: calculateRelevance(b.title, searchBook, b.author),
  }));

  // Primary criteria: Relevance (descending)
  // Secondary criteria: Price (ascending - cheaper first)
  return withRelevance.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    return a.price - b.price;
  });
}
