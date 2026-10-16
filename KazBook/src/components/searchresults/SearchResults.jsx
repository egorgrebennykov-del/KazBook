import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import searchBooks from "../../../utils/searchBooks";
import "./SearchResults.css";

const loadingMessages = [
  "Checking bookstores",
  "Searching for your books",
  "Comparing prices",
  "Browsing book catalogs",
  "Finding the best deals",
  "Checking book availability",
  "Collecting prices from stores",
  "Comparing book editions",
  "Looking for the lowest prices",
  "Almost there",
  "Exploring bookstore listings",
  "Hunting for the best deals",
  "Checking the latest offers",
  "Gathering search results",
  "Finding your next read",
];

function LoadingMessage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % loadingMessages.length),
      2000,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <p key={index} className="results__message">
      {loadingMessages[index]}
      <span className="results__dots" />
    </p>
  );
}

function BookImage({ src, alt }) {
  return src ? (
    <img src={src} alt={alt} className="results__img" loading="lazy" />
  ) : (
    <div className="results__img" />
  );
}

export default function SearchResults() {
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;

    let cancelled = false;
    setLoading(true);
    searchBooks(query)
      .then((result) => !cancelled && setBooks(result))
      .catch(() => !cancelled && setBooks([]))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <section className="results section container">
      <h2 className="section__title">Results for “{query}”</h2>

      {loading && (
        <div className="results__loader">
          <div className="results__spinner" />
          <LoadingMessage />
        </div>
      )}
      {!loading && books.length === 0 && <p>Nothing found</p>}

      <div className="results__grid">
        {!loading &&
          books.map((book, i) => (
            <article className="results__card" key={`${book.title}-${i}`}>
              <BookImage src={book.image} alt={book.title} />
              <h3 className="results__title">{book.title}</h3>
              <span className="results__store">{book.store}</span>
              <span className="results__price">
                {Number.isNaN(book.price)
                  ? "—"
                  : new Intl.NumberFormat("ru-RU", {
                      style: "currency",
                      currency: book.currency,
                      maximumFractionDigits: book.currency === "EUR" ? 2 : 0,
                    }).format(book.price)}
              </span>
            </article>
          ))}
      </div>
    </section>
  );
}
