import axios from "axios";

export default function getBooksFromMeloman(searchBook) {
  return axios
    .post(
      "https://api.zyte.com/v1/extract",
      {
        url: `https://www.meloman.kz/catalogsearch/result/index/q/${encodeURIComponent(searchBook)}/?cat=1172&q=${encodeURIComponent(searchBook)}&search_cat=0&stock=1`,
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
