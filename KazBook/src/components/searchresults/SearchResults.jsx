import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import searchBooks from "../../../utils/searchBooks";
import removeWhiteBackground from "../../../utils/removeWhiteBackground";
import "./SearchResults.css";

function BookImage({ src, alt }) {
  const [url, setUrl] = useState(src);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    removeWhiteBackground(src)
      .then((png) => !cancelled && setUrl(png))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src]);

  return src ? (
    <img src={url} alt={alt} className="results__img" />
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
                  : `${book.price} ${book.currency}`}
              </span>
            </article>
          ))}
      </div>
    </section>
  );
}
