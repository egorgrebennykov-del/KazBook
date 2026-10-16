import getBooksFromFlip from "./getBooksFromFlip";
import getBooksFromMarvin from "./getBooksFromMarvin";
import getBooksFromMeloman from "./getBooksFromMeloman";
import getExchangeRate from "./getExchangeRate";

const SOURCES = [
  { store: "flip.kz", fetch: getBooksFromFlip },
  { store: "meloman.kz", fetch: getBooksFromMeloman },
  { store: "marwin.kz", fetch: getBooksFromMarvin },
];

function normalize(product, store, rate) {
  const kzt = Number.parseFloat(
    String(product.price ?? "").replace(/[^\d.]/g, ""),
  );
  const inEur = rate && !Number.isNaN(kzt);
  return {
    title: product.name ?? "",
    price: inEur ? Math.round((kzt / rate) * 100) / 100 : kzt,
    currency: rate ? "EUR" : "KZT",
    url: product.url ?? "",
    image: product.mainImage?.url ?? product.images?.[0]?.url ?? "",
    store,
  };
}

const tokenize = (s) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

function splitTitle(title) {
  const colon = title.indexOf(":");
  if (colon > 0) return [title.slice(0, colon), title.slice(colon + 1), true];
  const sentence = title.match(/^.*?\p{L}{3,}\./u);
  if (sentence) return [sentence[0], title.slice(sentence[0].length), true];
  return [title.split(/\s+/).slice(0, 3).join(" "), title, false];
}

function relevance(title, query) {
  const words = tokenize(query);
  if (words.length === 0) return 0;
  const phrase = words.join(" ");
  const [author, work, hasAuthor] = splitTitle(title);

  if (
    tokenize(work).join(" ") === phrase ||
    tokenize(title).join(" ") === phrase
  )
    return 3;
  if (
    hasAuthor &&
    (" " + tokenize(work).join(" ") + " ").includes(" " + phrase + " ")
  )
    return 2.5;
  const authorText = author.toLowerCase();
  if (words.every((w) => authorText.includes(w))) return 2;
  const titleWords = tokenize(title);
  if ((" " + titleWords.join(" ") + " ").includes(" " + phrase + " "))
    return 1.5;
  const set = new Set(titleWords);
  return words.filter((w) => set.has(w)).length / words.length;
}

export default async function searchBooks(searchBook) {
  const words = tokenize(searchBook);
  const wordPatterns = words.map(
    (w) => new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "iu"),
  );
  const matchesQuery = (title) => wordPatterns.every((re) => re.test(title));

  const [results, rate] = await Promise.all([
    Promise.allSettled(SOURCES.map((s) => s.fetch(searchBook))),
    getExchangeRate().catch(() => null),
  ]);

  const books = results.flatMap((r, i) =>
    r.status === "fulfilled"
      ? r.value.map((p) => normalize(p, SOURCES[i].store, rate))
      : [],
  );

  return books
    .filter((b) => Number.isFinite(b.price) && b.price > 0)
    .filter((b) => matchesQuery(b.title))
    .map((b) => ({ ...b, relevance: relevance(b.title, searchBook) }))
    .sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return a.price - b.price;
    });
}
