import axios from "axios";

export default function getBooksFromFlip(searchBook) {
  return axios
    .post(
      "https://api.zyte.com/v1/extract",
      {
        url: `https://www.flip.kz/search?search=${encodeURIComponent(searchBook)}&subsection=1&filter-i103=1`,
        productList: true,
        productListOptions: { extractFrom: "httpResponseBody" },
        followRedirect: true,
      },
      {
        auth: { username: "24c074604b62474cbeb63b2e939de1b8" },
      },
    )
    .then((response) => response.data.productList?.products ?? []);
}
