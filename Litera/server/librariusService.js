import axios from "axios";
import https from "node:https";
import decodeHtmlEntities from "../utils/decodeHtmlEntities.js";

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const searchCache = new Map();
const detailsCache = new Map();
const SEARCH_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DETAILS_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function decodeLibrariusImage(url) {
  if (!url) return "";
  try {
    const match = url.match(/\/img\/\d+\/\d+\/(?:x)?([A-Za-z0-9_-]+)/);
    if (match) {
      let b64 = match[1].replace(/_e_/g, "=").replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4 !== 0) b64 += "=";
      const decoded =
        typeof atob === "function"
          ? atob(b64)
          : globalThis.Buffer?.from(b64, "base64").toString("utf8") ?? "";
      if (decoded.startsWith("http")) return decoded;
    }
  } catch {
    // Ignore decoding errors and fallback to original URL
  }
  return url.replace(/^http:\/\/cdn\./, "https://cdn.");
}

export function parseLibrariusHtml(html) {
  const cards = html.split('<div class="anyproduct-card">').slice(1);
  const products = [];

  for (const card of cards) {
    const linkMatch = card.match(/<a\s+href="([^"]+)"/);
    const titleMatch = card.match(/<div class="card-title">([^<]+)<\/div>/);
    const priceMatch = card.match(/<div class="card-price">([^<]+)<\/div>/);
    const imgMatch = card.match(/<img[^>]+src="([^"]+)"/);

    if (linkMatch && titleMatch) {
      const url = linkMatch[1];
      const name = decodeHtmlEntities(titleMatch[1]);
      const price = priceMatch ? priceMatch[1] : "";
      const imgSrc = imgMatch ? imgMatch[1] : "";
      const fullImg = decodeLibrariusImage(imgSrc);

      products.push({
        url,
        name,
        price,
        mainImage: { url: fullImg },
        images: [{ url: fullImg }],
      });
    }
  }
  return products;
}

export async function searchLibrarius(query) {
  const cacheKey = query.trim().toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const encodedQuery = encodeURIComponent(query).replace(/%20/g, "+");
  const getPageUrl = (page) =>
    `https://librarius.md/ru/esearch/page/${page}?search=${encodedQuery}`;

  const fetchPage = async (page) => {
    try {
      const response = await axios.get(getPageUrl(page), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        timeout: 8000,
      });
      return response.data;
    } catch {
      return "";
    }
  };

  const page1Html = await fetchPage(1);
  if (!page1Html) return [];

  const page1Products = parseLibrariusHtml(page1Html);
  const pageNumbers = [
    ...page1Html.matchAll(/\/ru\/esearch\/page\/(\d+)\?/g),
  ].map((m) => Number(m[1]));
  const maxPage = pageNumbers.length
    ? Math.min(Math.max(...pageNumbers), 10)
    : 1;

  let allProducts = [...page1Products];

  if (maxPage > 1) {
    const pagePromises = [];
    for (let p = 2; p <= maxPage; p++) {
      pagePromises.push(fetchPage(p));
    }
    const htmls = await Promise.all(pagePromises);
    for (const html of htmls) {
      if (html) {
        allProducts.push(...parseLibrariusHtml(html));
      }
    }
  }

  // Deduplicate products by URL
  const seenUrls = new Set();
  const uniqueProducts = allProducts.filter((p) => {
    if (!p.url || seenUrls.has(p.url)) return false;
    seenUrls.add(p.url);
    return true;
  });

  searchCache.set(cacheKey, {
    data: uniqueProducts,
    expiresAt: Date.now() + SEARCH_TTL_MS,
  });

  return uniqueProducts;
}

export function parseLibrariusDetails(html, pageUrl) {
  let jsonLd = null;
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      jsonLd = data.mainEntity || data;
    } catch {
      // Fallback if JSON-LD parse fails
    }
  }

  const rawTitle =
    jsonLd?.name ||
    html.match(/<h1[^>]*class="[^"]*book-title[^"]*"[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim() ||
    "";
  const title = decodeHtmlEntities(rawTitle);
  const rawAuthor =
    jsonLd?.author ||
    html.match(/class="book-prop-name">Автор<\/div>[\s\S]*?<div class="book-prop-value">([^<]+)<\/div>/i)?.[1]?.trim() ||
    "";
  const author = decodeHtmlEntities(rawAuthor);
  const price =
    jsonLd?.offers?.price ||
    html.match(/class="book-page-price">([^<]+)<\/div>/i)?.[1]?.replace(/[^\d.]/g, "") ||
    "";
  const isbn =
    jsonLd?.isbn ||
    html.match(/class="book-prop-name">ISBN<\/div>[\s\S]*?<div class="book-prop-value">([^<]+)<\/div>/i)?.[1]?.trim() ||
    "";
  const publisher = decodeHtmlEntities(
    jsonLd?.publisher ||
    html.match(/class="book-prop-name">Издательство<\/div>[\s\S]*?<div class="book-prop-value">([^<]+)<\/div>/i)?.[1]?.trim() ||
    "",
  );
  const pages =
    jsonLd?.numberOfPages ||
    html.match(/class="book-prop-name">Страницы<\/div>[\s\S]*?<div class="book-prop-value">([^<]+)<\/div>/i)?.[1]?.trim() ||
    "";
  const year =
    jsonLd?.datePublished?.slice(0, 4) ||
    html.match(/class="book-prop-name">Год<\/div>[\s\S]*?<div class="book-prop-value">([^<]+)<\/div>/i)?.[1]?.trim() ||
    "";

  // Description
  let description = "";
  const descSection = html.match(/class="book-page-description">([\s\S]*?)<\/div>/i);
  if (descSection) {
    description = descSection[1]
      .replace(/<div class="nav nav-tabs">[\s\S]*?<\/div>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (!description && jsonLd?.description) {
    description = String(jsonLd.description).trim();
  }
  description = decodeHtmlEntities(description);

  const additionalProperties = [];
  if (author) additionalProperties.push({ name: "автор", value: author });
  if (publisher) additionalProperties.push({ name: "издательство", value: publisher });
  if (year) additionalProperties.push({ name: "год издания", value: year });
  if (pages) additionalProperties.push({ name: "количество страниц", value: pages });
  if (isbn) additionalProperties.push({ name: "isbn", value: isbn });

  const propMatches = [
    ...html.matchAll(
      /class="book-prop-name">([^<]+)<\/div>[\s\S]*?<div class="book-prop-value">([^<]+)<\/div>/gi,
    ),
  ];
  for (const m of propMatches) {
    const pName = decodeHtmlEntities(m[1].trim().toLowerCase());
    const pVal = decodeHtmlEntities(m[2].trim());
    if (!additionalProperties.some((p) => p.name.toLowerCase() === pName)) {
      additionalProperties.push({ name: pName, value: pVal });
    }
  }

  let imageUrl = jsonLd?.image || "";
  if (!imageUrl) {
    const imgMatch = html.match(
      /class="[^"]*book-page-image[^"]*"[\s\S]*?<img[^>]+src="([^"]+)"/i,
    );
    imageUrl = imgMatch ? imgMatch[1] : "";
  }
  imageUrl = decodeLibrariusImage(imageUrl);

  return {
    name: title,
    url: pageUrl,
    price: String(price),
    currency: jsonLd?.offers?.priceCurrency || "MDL",
    availability: jsonLd?.offers?.availability?.includes("InStock")
      ? "InStock"
      : "OutOfStock",
    description,
    mainImage: { url: imageUrl },
    images: [{ url: imageUrl }],
    additionalProperties,
    brand: { name: "librarius.md" },
  };
}

export async function getLibrariusDetails(url) {
  const cached = detailsCache.get(url);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const response = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    httpsAgent,
    timeout: 7000,
  });

  const details = parseLibrariusDetails(response.data, url);
  detailsCache.set(url, {
    data: details,
    expiresAt: Date.now() + DETAILS_TTL_MS,
  });

  return details;
}
