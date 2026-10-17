import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import getBookDetails from "../../../utils/getBookDetails";
import getExchangeRate from "../../../utils/getExchangeRate";
import { addToCart, getCartItem, removeFromCart } from "../../../utils/cart";
import { getCookieUser, isLoggedIn } from "../../../utils/auth";
import "./BookDetails.css";

const HIDDEN_PROPERTIES = /^цена|вы экономите|иллюстрированное издание|тираж/i;

const PROPERTY_NAMES = {
  код: "Code",
  "код товара": "Code",
  автор: "Author",
  серия: "Series",
  "серия книг": "Series",
  "год издания": "Year",
  "дата выхода": "Year",
  жанр: "Genre",
  издательство: "Publisher",
  isbn: "ISBN",
  возраст: "Age",
  "количество страниц": "Pages",
  переплет: "Binding",
  язык: "Language",
  "страна производитель": "Country",
  бумага: "Paper",
  "формат издания": "Format",
  продавец: "Seller",
};

const PROPERTY_VALUES = {
  русский: "Russian",
  казахский: "Kazakh",
  английский: "English",
  "мягкая обложка": "Softcover",
  "твердый переплет": "Hardcover",
  "твердая обложка": "Hardcover",
  газетная: "Newsprint",
  офсетная: "Offset",
  мелованная: "Coated",
  россия: "Russia",
  казахстан: "Kazakhstan",
  да: "Yes",
  нет: "No",
};

const translate = (dictionary, text) =>
  dictionary[String(text).trim().toLowerCase()] ?? text;

const formatPrice = (value, currency) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "EUR" ? 2 : 0,
  }).format(value);

export default function BookDetails() {
  const [params] = useSearchParams();
  const url = params.get("url") ?? "";
  const { state } = useLocation();
  const navigate = useNavigate();
  const preview = state?.book;
  const searchQuery = params.get("q") ?? state?.query;
  const backTo = state?.fromCart
    ? "/cart"
    : state?.fromDiscount
      ? "/discount"
      : searchQuery
        ? `/search?q=${encodeURIComponent(searchQuery)}`
        : "/";

  const [product, setProduct] = useState(null);
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cartStatus, setCartStatus] = useState({
    url: "",
    exists: false,
    id: null,
  });
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartError, setCartError] = useState("");
  const [pendingAddUrl, setPendingAddUrl] = useState("");
  const [pendingQuantity, setPendingQuantity] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    Promise.all([getBookDetails(url), getExchangeRate().catch(() => null)])
      .then(([details, eurRate]) => {
        if (cancelled) return;
        setProduct(details);
        setRate(eurRate);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!url || !isLoggedIn()) return;
    let cancelled = false;
    getCartItem(url, getCookieUser()?.id)
      .then(
        (item) =>
          !cancelled &&
          setCartStatus({ url, exists: Boolean(item), id: item?.id ?? null }),
      )
      .catch((err) => !cancelled && setCartError(err.message));
    return () => {
      cancelled = true;
    };
  }, [url]);

  const addedToCart = cartStatus.url === url && cartStatus.exists;

  const title = product?.name ?? preview?.title ?? "";
  const image =
    product?.mainImage?.url ?? product?.images?.[0]?.url ?? preview?.image;

  const kzt = Number.parseFloat(product?.price);
  const toEur = (value) => Math.round((value / rate) * 100) / 100;
  let price = null;
  if (preview && Number.isFinite(preview.price)) {
    price =
      preview.currency !== "EUR" && rate
        ? formatPrice(toEur(preview.price), "EUR")
        : formatPrice(preview.price, preview.currency);
  } else if (Number.isFinite(kzt) && rate) {
    price = formatPrice(toEur(kzt), "EUR");
  } else if (Number.isFinite(kzt)) {
    price = formatPrice(kzt, "KZT");
  }

  const seen = new Set();
  const properties = (product?.additionalProperties ?? [])
    .filter((p) => p.name && p.value && !HIDDEN_PROPERTIES.test(p.name))
    .map((p) => ({
      name: translate(PROPERTY_NAMES, p.name),
      value: translate(PROPERTY_VALUES, p.value),
    }))
    .filter((p) => !seen.has(p.name) && seen.add(p.name));
  const author = properties.find((p) => p.name === "Author")?.value;

  const handleToggleCart = async () => {
    if (!isLoggedIn()) {
      navigate("/cart");
      return;
    }
    setCartError("");
    if (addedToCart && cartStatus.id != null) {
      setAddingToCart(true);
      try {
        await removeFromCart(cartStatus.id);
        setCartStatus({ url, exists: false, id: null });
        setPendingAddUrl("");
        setPendingQuantity(1);
      } catch (err) {
        setCartError(err.message);
      } finally {
        setAddingToCart(false);
      }
      return;
    }
    if (pendingAddUrl !== url) {
      setPendingAddUrl(url);
      setPendingQuantity(1);
      return;
    }

    setAddingToCart(true);
    const cartPrice =
      preview?.price ??
      (Number.isFinite(kzt) && rate
        ? Math.round((kzt / rate) * 100) / 100
        : kzt);
    try {
      const item = await addToCart({
        title,
        url,
        image,
        store: preview?.store ?? product?.brand?.name ?? "Bookstore",
        price: cartPrice,
        currency: preview?.currency ?? (rate ? "EUR" : "KZT"),
        quantity: pendingQuantity,
      });
      setCartStatus({ url, exists: true, id: item?.id ?? null });
      setPendingAddUrl("");
    } catch (err) {
      setCartError(err.message);
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <section className="book section container">
      <button
        className="book__back"
        onClick={() =>
          navigate(backTo, {
            state: state?.fromCart
              ? { restoreCartScroll: true }
              : state?.fromDiscount
                ? { restoreDiscountScroll: true }
                : undefined,
          })
        }
      >
        <i className="ri-arrow-left-line" /> Back
      </button>

      {loading && (
        <div className="book__loader">
          <div className="book__spinner" />
        </div>
      )}

      {!loading && error && !preview && (
        <p>
          Could not load the book. <Link to="/">Go home</Link>
        </p>
      )}

      {!loading && (!error || preview) && (
        <div className="book__content">
          {image ? (
            <img src={image} alt={title} className="book__img" />
          ) : (
            <div className="book__img" />
          )}

          <div className="book__info">
            <div className="book__badges">
              {preview?.store && (
                <span className="book__badge">{preview.store}</span>
              )}
              {product?.availability && (
                <span
                  className={`book__badge ${
                    product.availability === "InStock"
                      ? "book__badge--ok"
                      : "book__badge--no"
                  }`}
                >
                  {product.availability === "InStock"
                    ? "In stock"
                    : "Out of stock"}
                </span>
              )}
            </div>

            <h1 className="book__title">{title}</h1>
            {author && <p className="book__author">{author}</p>}
            {price && <p className="book__price">{price}</p>}
            {pendingAddUrl === url && !addedToCart ? (
              <div className="book__quantity-control">
                <div className="book__quantity" aria-label="Quantity">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={addingToCart || pendingQuantity <= 1}
                    onClick={() =>
                      setPendingQuantity((quantity) =>
                        Math.max(1, quantity - 1),
                      )
                    }
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    aria-label="Quantity"
                    value={pendingQuantity}
                    disabled={addingToCart}
                    onChange={(event) => setPendingQuantity(event.target.value)}
                    onBlur={() =>
                      setPendingQuantity((quantity) =>
                        Math.max(1, Math.floor(Number(quantity) || 1)),
                      )
                    }
                  />
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={addingToCart}
                    onClick={() =>
                      setPendingQuantity((quantity) => Number(quantity) + 1)
                    }
                  >
                    +
                  </button>
                </div>
                <button
                  className="book__cart-confirm"
                  type="button"
                  aria-label="Confirm adding to cart"
                  title="Confirm"
                  disabled={addingToCart}
                  onClick={handleToggleCart}
                >
                  <i className="ri-check-line" />
                </button>
              </div>
            ) : (
              <button
                className="book__add-cart button"
                type="button"
                onClick={handleToggleCart}
                disabled={addingToCart}
              >
                <i
                  className={
                    addedToCart ? "ri-check-line" : "ri-shopping-basket-2-line"
                  }
                />
                {addingToCart
                  ? addedToCart
                    ? "Removing..."
                    : "Adding..."
                  : addedToCart
                    ? "Added to cart"
                    : "Add to cart"}
              </button>
            )}
            {cartError && (
              <p className="book__cart-error" role="alert">
                {cartError}
              </p>
            )}

            {product?.description && (
              <div className="book__section">
                <h2 className="book__heading">About the book</h2>
                <p className="book__description">{product.description}</p>
              </div>
            )}

            {properties.length > 0 && (
              <div className="book__section">
                <h2 className="book__heading">Details</h2>
                <dl className="book__props">
                  {properties.map((p) => (
                    <div key={p.name} className="book__prop">
                      <dt>{p.name}</dt>
                      <dd>{p.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
