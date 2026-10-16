import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import getBookDetails from "../../../utils/getBookDetails";
import getExchangeRate from "../../../utils/getExchangeRate";
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
  const backTo = searchQuery
    ? `/search?q=${encodeURIComponent(searchQuery)}`
    : "/";

  const [product, setProduct] = useState(null);
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  return (
    <section className="book section container">
      <button className="book__back" onClick={() => navigate(backTo)}>
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
