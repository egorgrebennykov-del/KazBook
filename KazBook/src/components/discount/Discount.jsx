import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import getExchangeRate from "../../../utils/getExchangeRate";
import getDiscountSnapshot from "../../../utils/getDiscountSnapshot";
import "./Discount.css";

function formatPrice(value, currency) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "EUR" ? 2 : 0,
  }).format(value);
}

function normalizeSnapshot(value) {
  const source = typeof value === "string" ? JSON.parse(value) : value;
  const products = Array.isArray(source?.products) ? source.products : [];

  return {
    updatedAt: source?.updatedAt ?? source?.metadata?.dateDownloaded ?? null,
    products: products
      .map((book) => {
        const price = Number.parseFloat(
          String(book.price ?? "").replace(/[^\d.]/g, ""),
        );
        const regularPrice = Number.parseFloat(
          String(book.regularPrice ?? "").replace(/[^\d.]/g, ""),
        );
        const calculatedDiscount =
          Number.isFinite(price) && regularPrice > price
            ? Math.round((1 - price / regularPrice) * 100)
            : 0;

        return {
          ...book,
          title: book.title ?? book.name ?? "",
          image:
            book.image ?? book.mainImage?.url ?? book.images?.[0]?.url ?? "",
          price,
          regularPrice,
          currency: book.currency ?? "KZT",
          discountPercent: Number(book.discountPercent) || calculatedDiscount,
          store: book.store ?? "flip.kz",
        };
      })
      .filter(
        (book) =>
          book.title &&
          book.url &&
          book.image &&
          Number.isFinite(book.price) &&
          Number.isFinite(book.regularPrice) &&
          book.regularPrice > book.price,
      ),
  };
}

export default function Discount() {
  const location = useLocation();
  const [snapshot, setSnapshot] = useState(null);
  const [rate, setRate] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([getDiscountSnapshot(), getExchangeRate().catch(() => null)])
      .then(([data, exchangeRate]) => {
        if (cancelled) return;
        setSnapshot(normalizeSnapshot(data));
        setRate(exchangeRate);
      })
      .catch((err) => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!snapshot || !location.state?.restoreDiscountScroll) return;
    const savedScroll = Number(
      sessionStorage.getItem("kazbook-discount-scroll"),
    );
    sessionStorage.removeItem("kazbook-discount-scroll");
    if (!Number.isFinite(savedScroll)) return;
    requestAnimationFrame(() => window.scrollTo(0, savedScroll));
  }, [snapshot, location.state]);

  if (error) {
    return (
      <section className="deals section container">
        <div className="deals__state deals__error">{error}</div>
      </section>
    );
  }

  if (!snapshot) {
    return (
      <section className="deals section container">
        <div className="deals__state">Loading discounts...</div>
      </section>
    );
  }

  const products = snapshot.products ?? [];

  return (
    <section className="deals section container">
      <div className="deals__heading">
        <div>
          <h1 className="deals__title">Discount books</h1>
          {snapshot.updatedAt && (
            <p className="deals__updated">
              Updated{" "}
              {new Intl.DateTimeFormat("en-GB").format(
                new Date(snapshot.updatedAt),
              )}
            </p>
          )}
        </div>
        <span className="deals__updated">{products.length} offers</span>
      </div>

      {products.length === 0 ? (
        <div className="deals__state">
          No discounted books in the latest update.
        </div>
      ) : (
        <div className="deals__grid">
          {products.map((book) => {
            const currency = rate ? "EUR" : book.currency;
            const price = rate ? book.price / rate : book.price;
            const regularPrice = rate
              ? book.regularPrice / rate
              : book.regularPrice;
            const preview = {
              title: book.title,
              url: book.url,
              image: book.image,
              store: book.store,
              price,
              currency,
            };

            return (
              <Link
                className="results__card deals__card"
                key={book.url}
                to={`/book?url=${encodeURIComponent(book.url)}&q=${encodeURIComponent(book.title)}`}
                state={{ book: preview, query: book.title, fromDiscount: true }}
                onClick={() =>
                  sessionStorage.setItem(
                    "kazbook-discount-scroll",
                    String(window.scrollY),
                  )
                }
              >
                <div className="deals__image-wrap">
                  <img
                    className="results__img deals__image"
                    src={book.image}
                    alt={book.title}
                    loading="lazy"
                  />
                  <span className="deals__badge">-{book.discountPercent}%</span>
                </div>
                <h3 className="results__title deals__book-title">
                  {book.title}
                </h3>
                <span className="results__store deals__store">
                  {book.store}
                </span>
                <div className="deals__prices">
                  <strong className="results__price deals__price">
                    {formatPrice(price, currency)}
                  </strong>
                  <span className="deals__regular-price">
                    {formatPrice(regularPrice, currency)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
