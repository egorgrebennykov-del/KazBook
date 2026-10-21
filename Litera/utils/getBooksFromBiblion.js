import axios from "axios";

export default async function getBooksFromBiblion(searchBook) {
  const query = encodeURIComponent(searchBook);

  // 1. Fast local proxy endpoint
  try {
    const response = await axios.get(
      `/api/search-biblion?q=${query}`,
      { timeout: 9500 },
    );
    if (Array.isArray(response.data?.products)) {
      return response.data.products;
    }
  } catch {
    // If backend endpoint is unavailable, try direct fallback
  }

  // 2. Direct fetch in Node / SSR environment
  if (typeof window === "undefined") {
    try {
      const serverModule = ["..", "server", "biblionService.js"].join("/");
      const { searchBiblion } = await import(
        /* @vite-ignore */ serverModule
      );
      const direct = await searchBiblion(searchBook);
      if (direct?.length) return direct;
    } catch {
      // ignore
    }
  }

  return [];
}
