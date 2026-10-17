import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import searchBooks from "../../../utils/searchBooks";
import dedupeBooks from "../../../utils/dedupeBooks";
import { useSearchCache } from "../../context/searchCache";
import { addToCart, getCart, removeFromCart } from "../../../utils/cart";
import { getCookieUser, isLoggedIn } from "../../../utils/auth";
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

function BookImage({ src, alt, onLoad, onError }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className="results__img"
      loading="lazy"
      onLoad={onLoad}
      onError={onError}
    />
  );
}

export default function SearchResults() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = params.get("q") ?? "";
  const cache = useSearchCache();
  const [result, setResult] = useState({ query: "", books: [] });
  const [imageStatuses, setImageStatuses] = useState(() => new Map());
  const [cartItems, setCartItems] = useState(() => new Map());
  const [quantities, setQuantities] = useState(() => new Map());
  const [pendingUrls, setPendingUrls] = useState(() => new Set());
  const loggedIn = isLoggedIn();
  const userId = getCookieUser()?.id;
  const needsCartCheck = loggedIn && Boolean(userId);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [addingUrls, setAddingUrls] = useState(() => new Set());
  const [cartError, setCartError] = useState("");
  const cartReady = !needsCartCheck || cartLoaded;

  const cached = cache.get(query);
  const books = cached ?? (result.query === query ? result.books : []);
  const loading = Boolean(query) && !cached && result.query !== query;
  const visibleBooks = books.filter(
    (book) => book.image && imageStatuses.get(book.url) === "loaded",
  );
  const pendingCovers = books.some(
    (book) => book.image && !imageStatuses.has(book.url),
  );

  useEffect(() => {
    if (!query || cache.get(query)) return;

    let cancelled = false;
    searchBooks(query)
      .then((found) => dedupeBooks(found, query))
      .then((found) => {
        cache.set(query, found);
        if (!cancelled) setResult({ query, books: found });
      })
      .catch(() => !cancelled && setResult({ query, books: [] }));

    return () => {
      cancelled = true;
    };
  }, [query, cache]);

  useEffect(() => {
    if (!needsCartCheck) return;
    let cancelled = false;
    getCart(userId)
      .then((items) => {
        if (!cancelled) {
          setCartItems(new Map(items.map((item) => [item.link, item])));
          setQuantities(
            new Map(
              items.map((item) => [
                item.link,
                Math.max(1, Number(item.quantity) || 1),
              ]),
            ),
          );
        }
      })
      .catch((err) => !cancelled && setCartError(err.message))
      .finally(() => !cancelled && setCartLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [needsCartCheck, userId]);

  const handleToggleCart = async (book) => {
    if (!isLoggedIn()) {
      navigate("/cart");
      return;
    }
    setCartError("");
    const cartItem = cartItems.get(book.url);
    if (cartItem) {
      setAddingUrls((current) => new Set(current).add(book.url));
      try {
        await removeFromCart(cartItem.id, userId);
        setCartItems((current) => {
          const next = new Map(current);
          next.delete(book.url);
          return next;
        });
        setQuantities((current) => new Map(current).set(book.url, 1));
        setPendingUrls((current) => {
          const next = new Set(current);
          next.delete(book.url);
          return next;
        });
      } catch (err) {
        setCartError(err.message);
      } finally {
        setAddingUrls((current) => {
          const next = new Set(current);
          next.delete(book.url);
          return next;
        });
      }
      return;
    }

    if (!pendingUrls.has(book.url)) {
      setQuantities((current) => new Map(current).set(book.url, 1));
      setPendingUrls((current) => new Set(current).add(book.url));
      return;
    }

    setAddingUrls((current) => new Set(current).add(book.url));
    try {
      const quantity = Math.max(
        1,
        Math.floor(Number(quantities.get(book.url)) || 1),
      );
      const inserted = await addToCart(
        {
          title: book.title,
          url: book.url,
          price: book.price,
          image: book.image,
          store: book.store,
          quantity,
        },
        userId,
      );
      if (inserted) {
        setCartItems((current) => new Map(current).set(book.url, inserted));
        setQuantities((current) =>
          new Map(current).set(
            book.url,
            Math.max(1, Number(inserted.quantity) || quantity),
          ),
        );
        setPendingUrls((current) => {
          const next = new Set(current);
          next.delete(book.url);
          return next;
        });
      }
    } catch (err) {
      setCartError(err.message);
    } finally {
      setAddingUrls((current) => {
        const next = new Set(current);
        next.delete(book.url);
        return next;
      });
    }
  };

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
      {!loading && books.length > 0 && visibleBooks.length === 0 && (
        <p className="results__covers-status">
          {pendingCovers
            ? "Loading book covers..."
            : "No books with available covers were found."}
        </p>
      )}
      {cartError && (
        <p className="results__cart-error" role="alert">
          {cartError}
        </p>
      )}

      <div className="results__grid">
        {!loading &&
          books.map((book, i) => {
            if (!book.image || imageStatuses.get(book.url) === "failed") {
              return null;
            }
            const coverLoaded = imageStatuses.get(book.url) === "loaded";
            const cartItem = cartItems.get(book.url);
            const quantity = Math.max(
              1,
              Number(quantities.get(book.url) ?? cartItem?.quantity) || 1,
            );
            const isBusy = addingUrls.has(book.url) || !cartReady;
            const isPending = pendingUrls.has(book.url);
            return (
              <article
                className={`results__card ${coverLoaded ? "" : "results__card--cover-loading"}`}
                key={`${book.title}-${i}`}
              >
                <Link
                  className="results__open"
                  to={`/book?url=${encodeURIComponent(book.url)}&q=${encodeURIComponent(query)}`}
                  state={{ book, query }}
                >
                  <BookImage
                    src={book.image}
                    alt={book.title}
                    onLoad={() =>
                      setImageStatuses((current) =>
                        new Map(current).set(book.url, "loaded"),
                      )
                    }
                    onError={() =>
                      setImageStatuses((current) =>
                        new Map(current).set(book.url, "failed"),
                      )
                    }
                  />
                  <h3 className="results__title">{book.title}</h3>
                  <span className="results__store">{book.store}</span>
                  <span className="results__price">
                    {Number.isNaN(book.price)
                      ? "—"
                      : new Intl.NumberFormat("ru-RU", {
                          style: "currency",
                          currency: book.currency,
                          maximumFractionDigits:
                            book.currency === "EUR" ? 2 : 0,
                        }).format(book.price)}
                  </span>
                </Link>
                <div className="results__cart-actions">
                  {isPending && !cartItem && (
                    <div className="results__quantity-control">
                      <div className="results__quantity" aria-label="Quantity">
                        <button
                          type="button"
                          aria-label={`Decrease ${book.title} quantity`}
                          disabled={isBusy || quantity <= 1}
                          onClick={() =>
                            setQuantities((current) =>
                              new Map(current).set(book.url, quantity - 1),
                            )
                          }
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          aria-label={`${book.title} quantity`}
                          value={quantities.get(book.url) ?? quantity}
                          disabled={isBusy}
                          onChange={(event) =>
                            setQuantities((current) =>
                              new Map(current).set(
                                book.url,
                                event.target.value,
                              ),
                            )
                          }
                          onBlur={() =>
                            setQuantities((current) =>
                              new Map(current).set(
                                book.url,
                                Math.max(
                                  1,
                                  Math.floor(
                                    Number(current.get(book.url)) || 1,
                                  ),
                                ),
                              ),
                            )
                          }
                        />
                        <button
                          type="button"
                          aria-label={`Increase ${book.title} quantity`}
                          disabled={isBusy}
                          onClick={() =>
                            setQuantities((current) =>
                              new Map(current).set(book.url, quantity + 1),
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="results__cart-confirm"
                        type="button"
                        aria-label={`Confirm adding ${book.title} to cart`}
                        title="Confirm"
                        disabled={isBusy}
                        onClick={() => handleToggleCart(book)}
                      >
                        <i className="ri-check-line" />
                      </button>
                    </div>
                  )}
                  {(!isPending || cartItem) && (
                    <button
                      className="results__cart-button"
                      type="button"
                      disabled={isBusy}
                      title={cartItem ? "Remove from cart" : "Add to cart"}
                      onClick={() => handleToggleCart(book)}
                    >
                      <i
                        className={
                          cartItem
                            ? "ri-check-line"
                            : "ri-shopping-basket-2-line"
                        }
                      />
                      {addingUrls.has(book.url)
                        ? cartItem
                          ? "Removing..."
                          : isPending
                            ? "Adding..."
                            : "Add to cart"
                        : cartItem
                          ? "Added to cart"
                          : cartReady
                            ? "Add to cart"
                            : "Checking cart..."}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
      </div>
    </section>
  );
}
