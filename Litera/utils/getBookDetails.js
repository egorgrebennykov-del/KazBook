import axios from "axios";
import enhancedImageUrl from "./enhancedImageUrl.js";
import decodeHtmlEntities from "./decodeHtmlEntities.js";

const ALLOWED_HOSTS = [
  "librarius.md",
  "carturesti.md",
  "ulysses.md",
  "carteamea.md",
  "biblion.md",
];

function isAllowed(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === "https:" &&
      ALLOWED_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`))
    );
  } catch {
    return false;
  }
}

function normalizeProduct(product) {
  if (!product) return null;
  const rawImage =
    product.mainImage?.url ?? product.images?.[0]?.url ?? "";
  const fullImage = enhancedImageUrl(rawImage) || rawImage;
  return {
    ...product,
    name: decodeHtmlEntities(product.name ?? ""),
    description: decodeHtmlEntities(product.description ?? ""),
    mainImage: { url: fullImage },
    images: [{ url: fullImage }],
  };
}

export default async function getBookDetails(url) {
  if (!isAllowed(url)) return Promise.reject(new Error("Unsupported URL"));

  // 1. Try fast local endpoint (typically ~350ms)
  try {
    const response = await axios.get(
      `/api/book-details?url=${encodeURIComponent(url)}`,
      { timeout: 5000 },
    );
    if (response.data?.product) {
      return normalizeProduct(response.data.product);
    }
  } catch {
    // Fall back to direct in Node or Zyte
  }

  // 2. Direct fetch in Node / SSR environment
  if (typeof window === "undefined") {
    try {
      if (url.includes("librarius.md")) {
        const mod = ["..", "server", "librariusService.js"].join("/");
        const { getLibrariusDetails } = await import(/* @vite-ignore */ mod);
        const direct = await getLibrariusDetails(url);
        if (direct) return normalizeProduct(direct);
      } else if (url.includes("carturesti.md")) {
        const mod = ["..", "server", "carturestiService.js"].join("/");
        const { getCarturestiDetails } = await import(/* @vite-ignore */ mod);
        const direct = await getCarturestiDetails(url);
        if (direct) return normalizeProduct(direct);
      } else if (url.includes("ulysses.md")) {
        const mod = ["..", "server", "ulyssesService.js"].join("/");
        const { getUlyssesDetails } = await import(/* @vite-ignore */ mod);
        const direct = await getUlyssesDetails(url);
        if (direct) return normalizeProduct(direct);
      } else if (url.includes("carteamea.md")) {
        const mod = ["..", "server", "carteameaService.js"].join("/");
        const { getCarteameaDetails } = await import(/* @vite-ignore */ mod);
        const direct = await getCarteameaDetails(url);
        if (direct) return normalizeProduct(direct);
      } else if (url.includes("biblion.md")) {
        const mod = ["..", "server", "biblionService.js"].join("/");
        const { getBiblionDetails } = await import(/* @vite-ignore */ mod);
        const direct = await getBiblionDetails(url);
        if (direct) return normalizeProduct(direct);
      }
    } catch {
      // Fallback to Zyte
    }
  }

  // 3. Zyte extraction fallback
  return axios
    .post(
      "https://api.zyte.com/v1/extract",
      {
        url,
        product: true,
        productOptions: { extractFrom: "httpResponseBody" },
        followRedirect: true,
      },
      {
        auth: { username: "24c074604b62474cbeb63b2e939de1b8" },
      },
    )
    .then((response) => normalizeProduct(response.data.product ?? null));
}
