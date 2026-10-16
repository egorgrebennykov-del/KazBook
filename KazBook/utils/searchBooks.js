import getBooksFromFlip from "./getBooksFromFlip";
import getBooksFromMarvin from "./getBooksFromMarvin";
import getBooksFromMeloman from "./getBooksFromMeloman";

const SOURCES = [
  { store: "flip.kz", fetch: getBooksFromFlip },
  { store: "meloman.kz", fetch: getBooksFromMeloman },
  { store: "marwin.kz", fetch: getBooksFromMarvin },
];

function normalize(product, store) {
  return {
    title: product.name ?? "",
    price: Number.parseFloat(
      String(product.price ?? "").replace(/[^\d.]/g, ""),
    ),
    currency: product.currencyRaw ?? product.currency ?? "KZT",
    url: product.url ?? "",
    image: product.mainImage?.url ?? product.images?.[0]?.url ?? "",
    store,
  };
}

const tokenize = (s) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

// 3 — название совпадает с запросом, 2 — содержит фразу, 1 — содержит все слова, иначе доля слов
function relevance(title, query) {
  const words = tokenize(query);
  if (words.length === 0) return 0;
  const titleWords = tokenize(title);
  if (titleWords.join(" ") === words.join(" ")) return 3;
  if ((" " + titleWords.join(" ") + " ").includes(" " + words.join(" ") + " "))
    return 2;
  const set = new Set(titleWords);
  return words.filter((w) => set.has(w)).length / words.length;
}

export default async function searchBooks(searchBook) {
  const results = await Promise.allSettled(
    SOURCES.map((s) => s.fetch(searchBook)),
  );

  const books = results.flatMap((r, i) =>
    r.status === "fulfilled"
      ? r.value.map((p) => normalize(p, SOURCES[i].store))
      : [],
  );

  // Сначала релевантность, при равной — дешевле выше; без цены в конце
  return books
    .map((b) => ({ ...b, relevance: relevance(b.title, searchBook) }))
    .sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      const pa = Number.isNaN(a.price) ? Infinity : a.price;
      const pb = Number.isNaN(b.price) ? Infinity : b.price;
      return pa - pb;
    });
}
