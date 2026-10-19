function normalizeTitle(t) {
  return (t || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export default async function dedupeBooks(books, query) {
  if (books.length < 2) return books;

  // 1. Fast pre-pass: if two books from different stores have the exact same title or image URL,
  // group them and keep only the cheaper one.
  const titleGroups = new Map();
  const imageGroups = new Map();

  for (let i = 0; i < books.length; i++) {
    const norm = normalizeTitle(books[i].title);
    if (norm) {
      if (!titleGroups.has(norm)) titleGroups.set(norm, []);
      titleGroups.get(norm).push(i);
    }
    const img = books[i].image;
    if (img) {
      if (!imageGroups.has(img)) imageGroups.set(img, []);
      imageGroups.get(img).push(i);
    }
  }

  const removedIndices = new Set();
  const processGroup = (indices) => {
    if (indices.length < 2) return;
    const stores = new Set(indices.map((idx) => books[idx].store));
    if (stores.size < 2) return; // Only deduplicate across different bookstores
    const sorted = [...indices].sort((a, b) => {
      const priceA = Number.isFinite(books[a].price) ? books[a].price : Infinity;
      const priceB = Number.isFinite(books[b].price) ? books[b].price : Infinity;
      return priceA - priceB || a - b;
    });
    // Keep index 0 (cheapest), mark others for removal
    sorted.slice(1).forEach((idx) => removedIndices.add(idx));
  };

  for (const indices of titleGroups.values()) processGroup(indices);
  for (const indices of imageGroups.values()) processGroup(indices);

  let filtered = books.filter((_, idx) => !removedIndices.has(idx));
  if (filtered.length < 2) return filtered;

  // 2. Call server visual cover similarity API for visual matches across different stores
  try {
    const response = await fetch("/api/dedupe-books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ books: filtered, query }),
    });

    if (response.ok) {
      const result = await response.json();
      if (Array.isArray(result.books)) {
        filtered = result.books;
      }
    }
  } catch (error) {
    console.warn("Cover comparison API skipped:", error.message);
  }

  return filtered;
}
