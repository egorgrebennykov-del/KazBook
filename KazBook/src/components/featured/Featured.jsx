import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { addToCart, getCart, removeFromCart } from "../../../utils/cart";
import { getCookieUser, isLoggedIn } from "../../../utils/auth";
import getExchangeRate from "../../../utils/getExchangeRate";
import getBookPicks from "../../../utils/getBookPicks";
import enhancedImageUrl from "../../../utils/enhancedImageUrl";
import "./Featured.css";

function getEuroPrice(book, rate) {
  const price = Number(book.price);
  if (!Number.isFinite(price)) return null;
  if (book.currency === "EUR") return price;
  return rate ? price / rate : null;
}

function formatEuroPrice(price) {
  if (!Number.isFinite(price)) return "EUR rate unavailable";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(price);
}

export default function Featured() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [status, setStatus] = useState("loading");
  const [rate, setRate] = useState(null);
  const [cartItems, setCartItems] = useState(() => new Map());
  const [quantities, setQuantities] = useState(() => new Map());
  const [pendingUrls, setPendingUrls] = useState(() => new Set());
  const [cartLoaded, setCartLoaded] = useState(false);
  const [addingUrls, setAddingUrls] = useState(() => new Set());
  const [cartError, setCartError] = useState("");
  const userId = getCookieUser()?.id;
  const needsCartCheck = isLoggedIn() && Boolean(userId);
  const cartReady = !needsCartCheck || cartLoaded;

  useEffect(() => {
    let cancelled = false;
    Promise.all([getBookPicks(), getExchangeRate().catch(() => null)])
      .then(([items, exchangeRate]) => {
        if (cancelled) return;
        setBooks(items);
        setRate(exchangeRate);
        setStatus(items.length ? "ready" : "empty");
      })
      .catch(() => !cancelled && setStatus("error"));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!needsCartCheck) return;

    let cancelled = false;
    getCart(userId)
      .then((items) => {
        if (cancelled) return;
        setCartItems(new Map(items.map((item) => [item.link, item])));
        setQuantities(
          new Map(
            items.map((item) => [
              item.link,
              Math.max(1, Number(item.quantity) || 1),
            ]),
          ),
        );
      })
      .catch((error) => !cancelled && setCartError(error.message))
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
      } catch (error) {
        setCartError(error.message);
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

    const euroPrice = getEuroPrice(book, rate);
    if (!userId || !Number.isFinite(euroPrice)) {
      setCartError("Could not determine the EUR price for this book.");
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
          price: euroPrice,
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
    } catch (error) {
      setCartError(error.message);
    } finally {
      setAddingUrls((current) => {
        const next = new Set(current);
        next.delete(book.url);
        return next;
      });
    }
  };

  const eligibleBooks = books.filter((book) => {
    const price = getEuroPrice(book, rate);
    return price !== null && price >= 2;
  });

  return (
    <section className="featured section book-picks" id="featured">
      <div className="container">
        <h1 className="section__title">Book Picks</h1>
        {status === "loading" && (
          <p className="book-picks__status" role="status">
            Loading books...
          </p>
        )}
        {status === "error" && (
          <p className="book-picks__status" role="alert">
            Could not load Book Picks. Please try again later.
          </p>
        )}
        {status === "empty" && (
          <p className="book-picks__status">No books have been added yet.</p>
        )}
        {status === "ready" && !rate && (
          <p className="book-picks__status" role="alert">
            EUR exchange rate is unavailable. Book prices cannot be verified.
          </p>
        )}
        {status === "ready" && rate && eligibleBooks.length === 0 && (
          <p className="book-picks__status">
            No books meet the €2 minimum price.
          </p>
        )}
        {cartError && (
          <p className="book-picks__cart-error" role="alert">
            {cartError}
          </p>
        )}
        {status === "ready" && rate && eligibleBooks.length > 0 && (
          <div className="book-picks__grid">
            {eligibleBooks.map((book, index) => {
              const cartItem = cartItems.get(book.url);
              const quantity = Math.max(
                1,
                Number(quantities.get(book.url) ?? cartItem?.quantity) || 1,
              );
              const isBusy = addingUrls.has(book.url) || !cartReady || !rate;
              const isPending = pendingUrls.has(book.url);
              return (
                <article
                  className="results__card book-picks__card"
                  key={`${book.store}-${book.url}-${index}`}
                >
                  <Link
                    className="results__open"
                    to={`/book?url=${encodeURIComponent(book.url)}&source=book-picks`}
                    state={{ book }}
                  >
                    <img
                      className="results__img"
                      src={enhancedImageUrl(book.image)}
                      alt={book.title}
                      loading="lazy"
                    />
                    <h2 className="results__title">{book.title}</h2>
                    <span className="results__store">{book.store}</span>
                    <span className="results__price">
                      {formatEuroPrice(getEuroPrice(book, rate))}
                    </span>
                  </Link>
                  <div className="results__cart-actions">
                    {isPending && !cartItem && (
                      <div className="results__quantity-control">
                        <div
                          className="results__quantity"
                          aria-label="Quantity"
                        >
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
                        className="results__cart-button book-picks__cart-button"
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
        )}
      </div>
    </section>
  );
}
