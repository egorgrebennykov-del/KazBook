import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import CarouselControls from "../carouselcontrols/CarouselControls";
import getHomepageBooks from "../../../utils/getHomepageBooks";
import enhancedImageUrl from "../../../utils/enhancedImageUrl";
import "./Home.css";

export default function Home() {
  const location = useLocation();
  const [books, setBooks] = useState([]);
  const [booksError, setBooksError] = useState(false);
  const [booksReady, setBooksReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHomepageBooks()
      .then((items) => !cancelled && setBooks(items))
      .catch(() => !cancelled && setBooksError(true))
      .finally(() => !cancelled && setBooksReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!booksReady || !location.state?.restoreHomeScroll) return;
    const savedPageScroll = Number(
      sessionStorage.getItem("kazbook-home-page-scroll"),
    );
    const savedCarouselScroll = Number(
      sessionStorage.getItem("kazbook-home-carousel-scroll"),
    );
    sessionStorage.removeItem("kazbook-home-page-scroll");
    sessionStorage.removeItem("kazbook-home-carousel-scroll");

    requestAnimationFrame(() => {
      if (Number.isFinite(savedPageScroll)) {
        window.scrollTo(0, savedPageScroll);
      }
      const carousel = document.querySelector(".home__swiper");
      if (carousel && Number.isFinite(savedCarouselScroll)) {
        carousel.scrollTo({ left: savedCarouselScroll, behavior: "instant" });
      }
    });
  }, [booksReady, location.state]);

  return (
    <section className="home section" id="home">
      <div className="home__container container grid">
        <div className="home__data">
          <h1 className="home__title">
            Your Favorite Books <br /> From Kazakhstan to Europe
          </h1>
          <p className="home__description">
            KazBook finds your book across popular Kazakh bookstores and
            calculates the best available option with delivery to Europe, all in
            one final price.
          </p>
          <a href="#" className="button">
            Start Shopping
          </a>
        </div>
        <div className="home__images">
          <div className="carousel">
            <div className="home__swiper swiper">
              <div className="swiper-wrapper">
                {books.map((book, index) => (
                  <article
                    className="home__article swiper-slide"
                    key={book.url}
                  >
                    <Link
                      className="home__book-link"
                      to={`/book?url=${encodeURIComponent(book.url)}&q=${encodeURIComponent(book.title)}&source=home`}
                      state={{
                        book: {
                          title: book.title,
                          url: book.url,
                          image: book.image,
                          store: book.store,
                          price: book.price,
                          currency: book.currency,
                        },
                        query: book.title,
                        fromHome: true,
                      }}
                      onClick={() => {
                        sessionStorage.setItem(
                          "kazbook-home-page-scroll",
                          String(window.scrollY),
                        );
                        sessionStorage.setItem(
                          "kazbook-home-carousel-scroll",
                          String(
                            document.querySelector(".home__swiper")
                              ?.scrollLeft ?? 0,
                          ),
                        );
                      }}
                    >
                      <img
                        src={enhancedImageUrl(book.image)}
                        alt={book.title}
                        className="home__img"
                        loading="eager"
                        fetchPriority={index === 0 ? "high" : "auto"}
                      />
                      <span className="home__book-title">{book.title}</span>
                      <span className="home__book-publisher">
                        {book.publisher}
                      </span>
                    </Link>
                  </article>
                ))}
              </div>
            </div>
            <CarouselControls className="carousel__controls--home" />
            {books.length === 0 && (
              <p className="home__books-status">
                {booksError
                  ? "Featured books are unavailable."
                  : "Loading featured books..."}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
