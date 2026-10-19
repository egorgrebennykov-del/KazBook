import axios from "axios";

const ZYTE_API_KEY =
  import.meta.env?.VITE_ZYTE_API_KEY ?? "24c074604b62474cbeb63b2e939de1b8";

export default async function getBooksFromCarturesti(searchBook) {
  const query = encodeURIComponent(searchBook);

  // 1. Fast local proxy endpoint
  try {
    const response = await axios.get(
      `/api/search-carturesti?q=${query}`,
      { timeout: 9000 },
    );
    if (Array.isArray(response.data?.products)) {
      return response.data.products;
    }
  } catch {
    // If backend endpoint is unavailable, try direct / Zyte fallback
  }

  // 2. Direct fetch in Node / SSR environment
  if (typeof window === "undefined") {
    try {
      const serverModule = ["..", "server", "carturestiService.js"].join("/");
      const { searchCarturesti } = await import(
        /* @vite-ignore */ serverModule
      );
      const direct = await searchCarturesti(searchBook);
      if (direct?.length) return direct;
    } catch {
      // Fallback to Zyte
    }
  }

  // 3. Zyte extraction fallback
  try {
    const response = await axios.post(
      "https://api.zyte.com/v1/extract",
      {
        url: `https://carturesti.md/product/search/${query}?stock_label=in-stoc%7Cstoc-limitat&limba=Rusa&page=1`,
        productList: true,
        productListOptions: { extractFrom: "httpResponseBody" },
        followRedirect: true,
      },
      {
        auth: { username: ZYTE_API_KEY },
      },
    );
    return response.data.productList?.products ?? [];
  } catch {
    return [];
  }
}
