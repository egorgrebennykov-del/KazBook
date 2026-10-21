import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import getBookDetails from "../../../utils/getBookDetails";
import getExchangeRate from "../../../utils/getExchangeRate";
import { addToCart, getCartItem, removeFromCart } from "../../../utils/cart";
import { getCookieUser, isLoggedIn } from "../../../utils/auth";
import BookImage from "../common/BookImage";
import decodeHtmlEntities from "../../../utils/decodeHtmlEntities";
import { useLanguage } from "../../context/languageContext";
import "./BookDetails.css";

const HIDDEN_PROPERTIES = /^цена|вы экономите|иллюстрированное издание|тираж/i;

const PROPERTY_NAMES_EN = {
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

const PROPERTY_VALUES_EN = {
  русский: "Russian",
  румынский: "Romanian",
  молдавский: "Moldavian",
  английский: "English",
  "мягкая обложка": "Softcover",
  "твердый переплет": "Hardcover",
  "твердая обложка": "Hardcover",
  газетная: "Newsprint",
  офсетная: "Offset",
  мелованная: "Coated",
  россия: "Russia",
  молдова: "Moldova",
  да: "Yes",
  нет: "No",
};

const translate = (dictionary, text) =>
  dictionary[String(text).trim().toLowerCase()] ?? text;

const formatCapitalized = (text) => {
  const str = String(text).trim();
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatPrice = (value, currency, language) =>
  new Intl.NumberFormat(language === "ru" ? "ru-RU" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "EUR" ? 2 : 0,
  }).format(value);

export default function BookDetails() {
  const { language, t } = useLanguage();
  const [params] = useSearchParams();
  const url = params.get("url") ?? "";
  const { state } = useLocation();
  const navigate = useNavigate();
  const preview = state?.book;
  const searchQuery = params.get("q") ?? state?.query;
  const fromHome = state?.fromHome || params.get("source") === "home";
  const fromBookPicks = params.get("source") === "book-picks";
  const fromNew = state?.fromNew || params.get("source") === "new";
  const backTo = state?.fromCart
    ? "/cart"
    : state?.fromDiscount
      ? "/discount"
      : fromBookPicks
        ? "/featured"
        : fromNew
          ? "/new"
        : fromHome
          ? "/"
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const title = decodeHtmlEntities(product?.name ?? preview?.title ?? "");
  const image =
    product?.mainImage?.url ?? product?.images?.[0]?.url ?? preview?.image;

  const rawPrice = Number.parseFloat(product?.price);
  const toEur = (value) => Math.round((value / rate) * 100) / 100;
  let price = null;
  if (preview && Number.isFinite(preview.price)) {
    price =
      preview.currency !== "EUR" && rate
        ? formatPrice(toEur(preview.price), "EUR", language)
        : formatPrice(preview.price, preview.currency, language);
  } else if (Number.isFinite(rawPrice) && rate) {
    price = formatPrice(toEur(rawPrice), "EUR", language);
  } else if (Number.isFinite(rawPrice)) {
    price = formatPrice(rawPrice, product?.currency ?? "MDL", language);
  }

  const seen = new Set();
  const properties = (product?.additionalProperties ?? [])
    .filter((p) => p.name && p.value && !HIDDEN_PROPERTIES.test(p.name))
    .map((p) => {
      const decodedVal = decodeHtmlEntities(p.value);
      if (language === "en") {
        return {
          name: translate(PROPERTY_NAMES_EN, p.name),
          value: translate(PROPERTY_VALUES_EN, decodedVal),
        };
      }
      return {
        name: formatCapitalized(p.name),
        value: formatCapitalized(decodedVal),
      };
    })
    .filter((p) => !seen.has(p.name) && seen.add(p.name));

  const author = decodeHtmlEntities(
    properties.find((p) => p.name === "Author" || p.name.toLowerCase() === "автор")?.value ?? "",
  );

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
      (Number.isFinite(rawPrice) && rate
        ? Math.round((rawPrice / rate) * 100) / 100
        : rawPrice);
    try {
      const item = await addToCart({
        title,
        url,
        image,
        store: preview?.store ?? product?.brand?.name ?? "Bookstore",
        price: cartPrice,
        currency: preview?.currency ?? (rate ? "EUR" : "MDL"),
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
                : fromHome
                  ? { restoreHomeScroll: true }
                  : undefined,
          })
        }
      >
        <i className="ri-arrow-left-line" /> {t("book.back")}
      </button>

      {loading && !preview && (
        <div className="book__loader">
          <div className="book__spinner" />
        </div>
      )}

      {!loading && error && !preview && (
        <p>
          {t("book.notFound")} <Link to="/">{t("book.goHome")}</Link>
        </p>
      )}

      {(preview || !loading) && (!error || preview) && (
        <div className="book__content">
          <BookImage
            src={image}
            alt={title}
            className="book__img"
            loading="eager"
            fetchPriority="high"
          />

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
                    ? t("book.inStock")
                    : t("book.outOfStock")}
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
                    aria-label={t("cart.decrease")}
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
                    aria-label={t("cart.increase")}
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
                  aria-label={t("cart.confirm")}
                  title={t("cart.confirm")}
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
                    ? t("cart.removing")
                    : t("cart.adding")
                  : addedToCart
                    ? t("cart.addedToCart")
                    : t("cart.addToCart")}
              </button>
            )}
            {cartError && (
              <p className="book__cart-error" role="alert">
                {cartError}
              </p>
            )}

            {loading && preview && (
              <p className="book__loading-hint">{t("book.loadingHint")}</p>
            )}

            {product?.description && (
              <div className="book__section">
                <h2 className="book__heading">{t("book.about")}</h2>
                <p className="book__description">{product.description}</p>
              </div>
            )}

            {properties.length > 0 && (
              <div className="book__section">
                <h2 className="book__heading">{t("book.details")}</h2>
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
