import {
  cosineSimilarity,
  getImageEmbedding,
} from "../utils/bookSimilarity.js";

const SIMILARITY_THRESHOLD = 0.87;
const TITLE_CANDIDATE_THRESHOLD = 0.3;

function titleTokens(title, query) {
  const queryWords = new Set(
    (query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
      (word) => word.length > 2,
    ),
  );
  return new Set(
    (title.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
      (word) => word.length > 2 && !queryWords.has(word),
    ),
  );
}

function titlesAreCandidates(a, b, query) {
  const left = titleTokens(a.title, query);
  const right = titleTokens(b.title, query);
  if (!left.size || !right.size) {
    const fullLeft = new Set(
      a.title.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [],
    );
    const fullRight = new Set(
      b.title.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [],
    );
    const overlap = [...fullLeft].filter((word) => fullRight.has(word)).length;
    return (
      a.title.trim().toLowerCase() === b.title.trim().toLowerCase() ||
      (overlap > 0 && overlap / Math.min(fullLeft.size, fullRight.size) >= 0.5)
    );
  }
  const intersection = [...left].filter((word) => right.has(word)).length;
  return (
    intersection / Math.min(left.size, right.size) >= TITLE_CANDIDATE_THRESHOLD
  );
}

function createGroups(size, matchingPairs) {
  const parent = Array.from({ length: size }, (_, index) => index);
  const find = (value) => {
    if (parent[value] !== value) parent[value] = find(parent[value]);
    return parent[value];
  };

  for (const [left, right] of matchingPairs) {
    const rootLeft = find(left);
    const rootRight = find(right);
    if (rootLeft !== rootRight) parent[rootRight] = rootLeft;
  }

  const groups = new Map();
  for (const [left, right] of matchingPairs) {
    const root = find(left);
    if (!groups.has(root)) groups.set(root, new Set());
    groups.get(root).add(left);
    groups.get(root).add(right);
  }
  return [...groups.values()];
}

export async function dedupeBooks(books, query = "") {
  const candidates = [];
  for (let left = 0; left < books.length; left++) {
    for (let right = left + 1; right < books.length; right++) {
      if (!books[left].image || !books[right].image) continue;
      if (
        books[left].image !== books[right].image &&
        !titlesAreCandidates(books[left], books[right], query)
      ) {
        continue;
      }
      candidates.push([left, right]);
    }
  }
  if (!candidates.length) return books;

  const embeddings = new Map();
  const getEmbedding = async (image) => {
    let target = image;
    if (typeof target === "string" && target.startsWith("/api/enhance-image?url=")) {
      try {
        target = new URL(target, "http://localhost").searchParams.get("url") || target;
      } catch {
        // ignore
      }
    }
    if (!embeddings.has(target)) {
      embeddings.set(
        target,
        getImageEmbedding(target).catch(() => null),
      );
    }
    return embeddings.get(target);
  };

  const matchingPairs = [];
  for (const [left, right] of candidates) {
    const titleA = (books[left].title || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const titleB = (books[right].title || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const imgA = typeof books[left].image === "string" && books[left].image.startsWith("/api/enhance-image?url=")
      ? new URL(books[left].image, "http://localhost").searchParams.get("url") || books[left].image
      : books[left].image;
    const imgB = typeof books[right].image === "string" && books[right].image.startsWith("/api/enhance-image?url=")
      ? new URL(books[right].image, "http://localhost").searchParams.get("url") || books[right].image
      : books[right].image;
    if (books[left].image === books[right].image || imgA === imgB || (titleA && titleA === titleB)) {
      matchingPairs.push([left, right]);
      continue;
    }
    const [embeddingLeft, embeddingRight] = await Promise.all([
      getEmbedding(books[left].image),
      getEmbedding(books[right].image),
    ]);
    if (
      embeddingLeft &&
      embeddingRight &&
      cosineSimilarity(embeddingLeft, embeddingRight) >= SIMILARITY_THRESHOLD
    ) {
      matchingPairs.push([left, right]);
    }
  }

  const removed = new Set();
  for (const group of createGroups(books.length, matchingPairs)) {
    const stores = new Set([...group].map((idx) => books[idx].store));
    if (stores.size < 2) continue; // Only compare across different bookstores

    let minPrice = Infinity;
    for (const idx of group) {
      const price = Number.isFinite(books[idx].price)
        ? books[idx].price
        : Infinity;
      if (price < minPrice) minPrice = price;
    }
    if (!Number.isFinite(minPrice)) continue;

    const cheapestStores = new Set();
    for (const idx of group) {
      if (books[idx].price === minPrice) {
        cheapestStores.add(books[idx].store);
      }
    }

    // Remove book from another site if it is more expensive than the cheapest site,
    // and keep all books from the cheapest site
    for (const idx of group) {
      const book = books[idx];
      if (!cheapestStores.has(book.store) && book.price > minPrice) {
        removed.add(idx);
      }
    }
  }

  return books.filter((_, index) => !removed.has(index));
}
