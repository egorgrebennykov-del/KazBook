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
      if (books[left].store === books[right].store) continue;
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
    if (!embeddings.has(image)) {
      embeddings.set(
        image,
        getImageEmbedding(image).catch(() => null),
      );
    }
    return embeddings.get(image);
  };

  const matchingPairs = [];
  for (const [left, right] of candidates) {
    const titleA = (books[left].title || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const titleB = (books[right].title || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (books[left].image === books[right].image || (titleA && titleA === titleB)) {
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
    const ordered = [...group].sort((left, right) => {
      const priceLeft = Number.isFinite(books[left].price)
        ? books[left].price
        : Infinity;
      const priceRight = Number.isFinite(books[right].price)
        ? books[right].price
        : Infinity;
      return priceLeft - priceRight || left - right;
    });
    ordered.slice(1).forEach((index) => removed.add(index));
  }

  return books.filter((_, index) => !removed.has(index));
}
