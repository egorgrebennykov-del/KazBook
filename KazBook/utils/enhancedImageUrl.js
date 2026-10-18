export default function enhancedImageUrl(sourceUrl) {
  if (!sourceUrl || !/^https:\/\//i.test(sourceUrl)) return sourceUrl;
  return `/api/enhance-image?url=${encodeURIComponent(sourceUrl)}`;
}
