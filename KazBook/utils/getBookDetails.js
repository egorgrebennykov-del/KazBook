import axios from "axios";

const ALLOWED_HOSTS = ["flip.kz", "meloman.kz", "marwin.kz"];

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

export default function getBookDetails(url) {
  if (!isAllowed(url)) return Promise.reject(new Error("Unsupported URL"));

  return axios
    .post(
      "https://api.zyte.com/v1/extract",
      {
        url,
        product: true,
        productOptions: { extractFrom: "httpResponseBody", ai: true },
        followRedirect: true,
      },
      {
        auth: { username: "24c074604b62474cbeb63b2e939de1b8" },
      },
    )
    .then((response) => response.data.product ?? null);
}
