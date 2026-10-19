export function decodeLibrariusImage(url) {
  if (!url || typeof url !== "string") return "";
  try {
    const match = url.match(/\/img\/\d+\/\d+\/(?:x)?([A-Za-z0-9_-]+)/);
    if (match) {
      let b64 = match[1].replace(/_e_/g, "=").replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4 !== 0) b64 += "=";
      const raw =
        typeof atob === "function"
          ? atob(b64)
          : globalThis.Buffer?.from(b64, "base64").toString("binary") ?? "";
      try {
        const decoded = decodeURIComponent(escape(raw));
        if (decoded.startsWith("http")) return decoded.replace(/^http:/i, "https:");
      } catch {
        if (raw.startsWith("http")) return raw.replace(/^http:/i, "https:");
      }
    }
  } catch {
    // Ignore decoding errors
  }
  return url.replace(/^http:\/\/cdn\./i, "https://cdn.");
}

export function decodeCarturestiImage(url) {
  if (!url || typeof url !== "string") return "";
  if (!url.includes("carturesti.md")) return url;
  // Convert /img-prod/126286-0-240.jpeg -> /img-prod/126286-0.jpeg (full original resolution)
  // Only remove thumbnail dimensions (e.g. -240, -480) and keep photo index (e.g. -0, -1)
  return url.replace(
    /(\/img-prod\/\d+(?:-\d+)?)-\d{3,4}\.(jpe?g|png|webp)(\?.*)?$/i,
    "$1.$2$3",
  );
}

export function decodeUlyssesImage(url) {
  if (!url || typeof url !== "string") return "";
  if (!url.includes("ulysses.md")) return url;
  // If it's a resize_cache URL, restore the original uncompressed image path
  if (url.includes("/resize_cache/iblock/")) {
    return url.replace(/\/resize_cache\/iblock\/([^/]+)\/[^/]+\/([^/]+)$/, "/iblock/$1/$2");
  }
  return url;
}

export default function enhancedImageUrl(sourceUrl) {
  if (!sourceUrl || typeof sourceUrl !== "string") return "";
  let resolved = sourceUrl;

  if (resolved.includes("librarius.md")) {
    resolved = decodeLibrariusImage(resolved);
  } else if (resolved.includes("carturesti.md")) {
    resolved = decodeCarturestiImage(resolved);
  } else if (resolved.includes("ulysses.md")) {
    resolved = decodeUlyssesImage(resolved);
  }

  if (/^https?:\/\//i.test(resolved)) {
    return resolved.replace(/^http:\/\/cdn\./i, "https://cdn.");
  }
  return resolved;
}
