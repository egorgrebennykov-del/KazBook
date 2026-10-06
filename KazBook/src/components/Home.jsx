import CarouselControls from "./CarouselControls";

export default function Home() {
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
                <article className="home__article swiper-slide">
                  <img
                    src="assets/img/home-book-1.png"
                    alt="image"
                    className="home__img"
                  />
                </article>
                <article className="home__article swiper-slide">
                  <img
                    src="assets/img/home-book-2.png"
                    alt="image"
                    className="home__img"
                  />
                </article>
                <article className="home__article swiper-slide">
                  <img
                    src="assets/img/home-book-3.png"
                    alt="image"
                    className="home__img"
                  />
                </article>
                <article className="home__article swiper-slide">
                  <img
                    src="assets/img/home-book-4.png"
                    alt="image"
                    className="home__img"
                  />
                </article>
              </div>
            </div>
            <CarouselControls className="carousel__controls--home" />
          </div>
        </div>
      </div>
    </section>
  );
}
