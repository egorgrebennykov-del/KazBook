import axios from "axios";

const ZYTE_API_KEY =
  import.meta.env?.VITE_ZYTE_API_KEY ?? "24c074604b62474cbeb63b2e939de1b8";

function decodeLibrariusImage(url) {
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
    // Ignore decoding errors
  }
  return url.replace(/^http:\/\/cdn\./, "https://cdn.");
}

function normalizeProducts(products) {
  return (products ?? []).map((product) => {
    const rawImage =
      product?.mainImage?.url ?? product?.images?.[0]?.url ?? "";
    const fullImage = decodeLibrariusImage(rawImage) || rawImage;
    return {
      ...product,
      mainImage: { url: fullImage },
      images: [{ url: fullImage }],
    };
  });
}

export default async function getBooksFromLibrarius(searchBook) {
  const query = encodeURIComponent(searchBook).replace(/%20/g, "+");

  // 1. Try fast local proxy endpoint (typically ~300-500ms)
  try {
    const response = await axios.get(
      `/api/search-librarius?q=${query}`,
      { timeout: 5000 },
    );
    if (Array.isArray(response.data?.products)) {
      return normalizeProducts(response.data.products);
    }
  } catch {
    // If backend endpoint is unavailable or errors, proceed to direct / Zyte fallback
  }

  // 2. Direct fetch in Node / SSR environment
  if (typeof window === "undefined") {
    try {
      const serverModule = ["..", "server", "librariusService.js"].join("/");
      const { searchLibrarius } = await import(/* @vite-ignore */ serverModule);
      const direct = await searchLibrarius(searchBook);
      if (direct?.length) return normalizeProducts(direct);
    } catch {
      // Fallback to Zyte
    }
  }

  // 3. Robust fallback: Zyte extraction
  return axios
    .post(
      "https://api.zyte.com/v1/extract",
      {
        url: `https://librarius.md/ru/esearch?search=${query}`,
        productList: true,
        productListOptions: { extractFrom: "httpResponseBody" },
        followRedirect: true,
      },
      {
        auth: { username: ZYTE_API_KEY },
      },
    )
    .then((response) => normalizeProducts(response.data.productList?.products ?? []));
}

