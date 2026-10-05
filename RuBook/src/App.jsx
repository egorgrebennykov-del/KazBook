function scrollCarousel(event, direction) {
  const carousel = event.currentTarget
    .closest(".carousel")
    ?.querySelector(".swiper");

  carousel?.scrollBy({
    left: direction * carousel.clientWidth * 0.8,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
}

function CarouselControls() {
  return (
    <div className="carousel__controls">
      <button
        type="button"
        className="carousel__button"
        aria-label="Scroll carousel left"
        onClick={(event) => scrollCarousel(event, -1)}
      >
        <i className="ri-arrow-left-s-line" />
      </button>
      <button
        type="button"
        className="carousel__button"
        aria-label="Scroll carousel right"
        onClick={(event) => scrollCarousel(event, 1)}
      >
        <i className="ri-arrow-right-s-line" />
      </button>
    </div>
  );
}

function App() {
  return (
    <>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      {/*=============== FAVICON ===============*/}
      <link
        rel="shortcut icon"
        href="assets/img/favicon.png"
        type="image/x-icon"
      />
      {/*=============== REMIXICONS ===============*/}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/remixicon/3.5.0/remixicon.css"
      />
      {/*=============== SWIPER CSS ===============*/}
      <link rel="stylesheet" href="assets/css/swiper-bundle.min.css" />
      {/*=============== CSS ===============*/}
      <link rel="stylesheet" href="/assets/css/styles.css" />
      <title>BookVerse - An Online Book Store</title>
      {/*==================== HEADER ====================*/}
      <header className="header" id="header">
        <nav className="nav container">
          <a href="#" className="nav__logo">
            <i className="ri-book-3-line" /> BookVerse
          </a>
          <div className="nav__menu">
            <ul className="nav__list">
              <li className="nav__item">
                <a href="#home" className="nav__link active-link">
                  <i className="ri-home-line" />
                  <span>Home</span>
                </a>
              </li>
              <li className="nav__item">
                <a href="#featured" className="nav__link">
                  <i className="ri-book-3-line" />
                  <span>Featured</span>
                </a>
              </li>
              <li className="nav__item">
                <a href="#discount" className="nav__link">
                  <i className="ri-price-tag-3-line" />
                  <span>Discount</span>
                </a>
              </li>
              <li className="nav__item">
                <a href="#new" className="nav__link">
                  <i className="ri-bookmark-line" />
                  <span>New Books</span>
                </a>
              </li>
              <li className="nav__item">
                <a href="#testimonial" className="nav__link">
                  <i className="ri-message-3-line" />
                  <span>Testimonial</span>
                </a>
              </li>
            </ul>
          </div>
          <div className="nav__actions">
            {/* Search Button */}
            <i className="ri-search-line search-button" id="search-button" />
            {/* Login Button */}
            <i className="ri-user-line login-button" id="login-button" />
            {/* Theme Button */}
            <i className="ri-moon-line change-theme" id="theme-button" />
          </div>
        </nav>
      </header>
      {/*==================== SEARCH ====================*/}
      <div className="search" id="search-content">
        <form action="" className="search__form">
          <i className="ri-search-line search__icon" />
          <input
            type="search"
            placeholder="What are you looking for?"
            className="search__input"
          />
        </form>
        <i className="ri-close-line search__close" id="search-close" />
      </div>
      {/*==================== LOGIN ====================*/}
      <div className="login grid" id="login-content">
        <form action="" className="login__form grid">
          <h3 className="login__title">Log In</h3>
          <div className="login__group grid">
            <div>
              <label htmlFor="login-email" className="login__label">
                Email
              </label>
              <input
                type="email"
                placeholder="Write your email"
                id="login-email"
                className="login__input"
              />
            </div>
            <div>
              <label htmlFor="login-pass" className="login__label">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                id="login-pass"
                className="login__input"
              />
            </div>
          </div>
          <div>
            <span className="login__signup">
              You do not have an account? <a href="#">Sign Up</a>
            </span>
            <a href="#" className="login__forgot">
              You forgot your password
            </a>
            <button type="submit" className="login__button button">
              Log In
            </button>
          </div>
        </form>
        <i className="ri-close-line login__close" id="login-close" />
      </div>
      {/*==================== MAIN ====================*/}
      <main className="main">
        {/*==================== HOME ====================*/}
        <section className="home section" id="home">
          <div className="home__container container grid">
            <div className="home__data">
              <h1 className="home__title">
                Browse &amp; <br />
                Select E-Books
              </h1>
              <p className="home__description">
                Find the best e-books from your favorite writers, explore
                hundreds of books with all possible categories, take advantage
                of the 50% discount and much more.
              </p>
              <a href="#" className="button">
                Explore Now
              </a>
            </div>
            <div className="home__images">
              <div className="carousel">
                <CarouselControls />
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
              </div>
            </div>
          </div>
        </section>
        {/*==================== SERVICES ====================*/}
        <section className="services section">
          <div className="services__container container grid">
            <article className="services__card">
              <i className="ri-truck-line" />
              <h3 className="services__title">Free Shipping</h3>
              <p className="services__description">Order More Than $100</p>
            </article>
            <article className="services__card">
              <i className="ri-lock-2-line" />
              <h3 className="services__title">Secure Payment</h3>
              <p className="services__description">100% Secure Payment</p>
            </article>
            <article className="services__card">
              <i className="ri-customer-service-2-line" />
              <h3 className="services__title">24/7 Support</h3>
              <p className="services__description">Call us anytime</p>
            </article>
          </div>
        </section>
        {/*==================== FEATURED ====================*/}
        <section className="featured section" id="featured">
          <h2 className="section__title">Featured Books</h2>
          <div className="featured__container container">
            <div className="carousel">
              <CarouselControls />
              <div className="featured__swiper swiper">
                <div className="swiper-wrapper">
                  <article className="featured__card swiper-slide">
                    <img
                      src="assets/img/book-1.png"
                      alt="image"
                      className="featured__img"
                    />
                    <h2 className="featured__title">Featured Book</h2>
                    <div className="featured__prices">
                      <span className="featured__discount">$11.99</span>
                      <span className="featured__price">$19.99</span>
                    </div>
                    <button className="button">Add To Cart</button>
                    <div className="featured__actions">
                      <button>
                        <i className="ri-search-line" />
                      </button>
                      <button>
                        <i className="ri-heart-3-line" />
                      </button>
                      <button>
                        <i className="ri-eye-line" />
                      </button>
                    </div>
                  </article>
                  <article className="featured__card swiper-slide">
                    <img
                      src="assets/img/book-2.png"
                      alt="image"
                      className="featured__img"
                    />
                    <h2 className="featured__title">Featured Book</h2>
                    <div className="featured__prices">
                      <span className="featured__discount">$11.99</span>
                      <span className="featured__price">$19.99</span>
                    </div>
                    <button className="button">Add To Cart</button>
                    <div className="featured__actions">
                      <button>
                        <i className="ri-search-line" />
                      </button>
                      <button>
                        <i className="ri-heart-3-line" />
                      </button>
                      <button>
                        <i className="ri-eye-line" />
                      </button>
                    </div>
                  </article>
                  <article className="featured__card swiper-slide">
                    <img
                      src="assets/img/book-3.png"
                      alt="image"
                      className="featured__img"
                    />
                    <h2 className="featured__title">Featured Book</h2>
                    <div className="featured__prices">
                      <span className="featured__discount">$11.99</span>
                      <span className="featured__price">$19.99</span>
                    </div>
                    <button className="button">Add To Cart</button>
                    <div className="featured__actions">
                      <button>
                        <i className="ri-search-line" />
                      </button>
                      <button>
                        <i className="ri-heart-3-line" />
                      </button>
                      <button>
                        <i className="ri-eye-line" />
                      </button>
                    </div>
                  </article>
                  <article className="featured__card swiper-slide">
                    <img
                      src="assets/img/book-4.png"
                      alt="image"
                      className="featured__img"
                    />
                    <h2 className="featured__title">Featured Book</h2>
                    <div className="featured__prices">
                      <span className="featured__discount">$11.99</span>
                      <span className="featured__price">$19.99</span>
                    </div>
                    <button className="button">Add To Cart</button>
                    <div className="featured__actions">
                      <button>
                        <i className="ri-search-line" />
                      </button>
                      <button>
                        <i className="ri-heart-3-line" />
                      </button>
                      <button>
                        <i className="ri-eye-line" />
                      </button>
                    </div>
                  </article>
                  <article className="featured__card swiper-slide">
                    <img
                      src="assets/img/book-5.png"
                      alt="image"
                      className="featured__img"
                    />
                    <h2 className="featured__title">Featured Book</h2>
                    <div className="featured__prices">
                      <span className="featured__discount">$11.99</span>
                      <span className="featured__price">$19.99</span>
                    </div>
                    <button className="button">Add To Cart</button>
                    <div className="featured__actions">
                      <button>
                        <i className="ri-search-line" />
                      </button>
                      <button>
                        <i className="ri-heart-3-line" />
                      </button>
                      <button>
                        <i className="ri-eye-line" />
                      </button>
                    </div>
                  </article>
                  <article className="featured__card swiper-slide">
                    <img
                      src="assets/img/book-6.png"
                      alt="image"
                      className="featured__img"
                    />
                    <h2 className="featured__title">Featured Book</h2>
                    <div className="featured__prices">
                      <span className="featured__discount">$11.99</span>
                      <span className="featured__price">$19.99</span>
                    </div>
                    <button className="button">Add To Cart</button>
                    <div className="featured__actions">
                      <button>
                        <i className="ri-search-line" />
                      </button>
                      <button>
                        <i className="ri-heart-3-line" />
                      </button>
                      <button>
                        <i className="ri-eye-line" />
                      </button>
                    </div>
                  </article>
                  <article className="featured__card swiper-slide">
                    <img
                      src="assets/img/book-7.png"
                      alt="image"
                      className="featured__img"
                    />
                    <h2 className="featured__title">Featured Book</h2>
                    <div className="featured__prices">
                      <span className="featured__discount">$11.99</span>
                      <span className="featured__price">$19.99</span>
                    </div>
                    <button className="button">Add To Cart</button>
                    <div className="featured__actions">
                      <button>
                        <i className="ri-search-line" />
                      </button>
                      <button>
                        <i className="ri-heart-3-line" />
                      </button>
                      <button>
                        <i className="ri-eye-line" />
                      </button>
                    </div>
                  </article>
                  <article className="featured__card swiper-slide">
                    <img
                      src="assets/img/book-8.png"
                      alt="image"
                      className="featured__img"
                    />
                    <h2 className="featured__title">Featured Book</h2>
                    <div className="featured__prices">
                      <span className="featured__discount">$11.99</span>
                      <span className="featured__price">$19.99</span>
                    </div>
                    <button className="button">Add To Cart</button>
                    <div className="featured__actions">
                      <button>
                        <i className="ri-search-line" />
                      </button>
                      <button>
                        <i className="ri-heart-3-line" />
                      </button>
                      <button>
                        <i className="ri-eye-line" />
                      </button>
                    </div>
                  </article>
                  <article className="featured__card swiper-slide">
                    <img
                      src="assets/img/book-9.png"
                      alt="image"
                      className="featured__img"
                    />
                    <h2 className="featured__title">Featured Book</h2>
                    <div className="featured__prices">
                      <span className="featured__discount">$11.99</span>
                      <span className="featured__price">$19.99</span>
                    </div>
                    <button className="button">Add To Cart</button>
                    <div className="featured__actions">
                      <button>
                        <i className="ri-search-line" />
                      </button>
                      <button>
                        <i className="ri-heart-3-line" />
                      </button>
                      <button>
                        <i className="ri-eye-line" />
                      </button>
                    </div>
                  </article>
                  <article className="featured__card swiper-slide">
                    <img
                      src="assets/img/book-10.png"
                      alt="image"
                      className="featured__img"
                    />
                    <h2 className="featured__title">Featured Book</h2>
                    <div className="featured__prices">
                      <span className="featured__discount">$11.99</span>
                      <span className="featured__price">$19.99</span>
                    </div>
                    <button className="button">Add To Cart</button>
                    <div className="featured__actions">
                      <button>
                        <i className="ri-search-line" />
                      </button>
                      <button>
                        <i className="ri-heart-3-line" />
                      </button>
                      <button>
                        <i className="ri-eye-line" />
                      </button>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/*==================== DISCOUNT ====================*/}
        <section className="discount section" id="discount">
          <div className="discount__container container grid">
            <div className="discount__data">
              <h2 className="discount__title section__title">
                Up To 50% Discount
              </h2>
              <p className="discount__description">
                Take advantage of the discount days we have for you, buy books
                from your favorite writers, the more you buy, the more discounts
                we have for you.
              </p>
              <a href="#" className="button">
                Shop Now
              </a>
            </div>
            <div className="discount__images">
              <img
                src="assets/img/discount-book-1.png"
                alt="image"
                className="discount__img-1"
              />
              <img
                src="assets/img/discount-book-2.png"
                alt="image"
                className="discount__img-2"
              />
            </div>
          </div>
        </section>
        {/*==================== NEW BOOKS ====================*/}
        <section className="new section" id="new">
          <h2 className="section__title">New Books</h2>
          <div className="new__container container">
            <div className="carousel">
              <CarouselControls />
              <div className="new__swiper swiper">
                <div className="swiper-wrapper">
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-1.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-2.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-3.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-4.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-5.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-6.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-7.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-8.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-9.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-10.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
            <div className="carousel">
              <CarouselControls />
              <div className="new__swiper swiper">
                <div className="swiper-wrapper">
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-10.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-9.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-8.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-7.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-6.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-5.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-4.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-3.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-2.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                  <a href="#" className="new__card swiper-slide">
                    <img
                      src="assets/img/book-1.png"
                      alt="image"
                      className="new__img"
                    />
                    <div>
                      <h2 className="new__title">New Book</h2>
                      <div className="new__prices">
                        <span className="new__discount">$7.99</span>
                        <span className="new__price">$14.99</span>
                      </div>
                      <div className="new__stars">
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-fill" />
                        <i className="ri-star-half-fill" />
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/*==================== JOIN ====================*/}
        <section className="join section">
          <div className="join__container">
            <img
              src="assets/img/join-bg.jpg"
              alt="image"
              className="join__bg"
            />
            <div className="join__data container grid">
              <h2 className="join__title section__title">
                Subscribe To Receive <br />
                The Latest Updates
              </h2>
              <form action="" className="join__form">
                <input
                  type="email"
                  placeholder="Enter email"
                  className="join__input"
                />
                <button type="submit" className="join__button button">
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </section>
        {/*==================== TESTIMONIAL ====================*/}
        <section className="testimonial section" id="testimonial">
          <h2 className="section__title">Customer Opinions</h2>
          <div className="testimonial__container container">
            <div className="carousel">
              <CarouselControls />
              <div className="testimonial__swiper swiper">
                <div className="swiper-wrapper">
                  <article className="testimonial__card swiper-slide">
                    <img
                      src="assets/img/testimonial-perfil-1.png"
                      alt="image"
                      className="testimonial__img"
                    />
                    <h2 className="testimonial__title">Rial Loz</h2>
                    <p className="testimonial__description">
                      The best website to buy books, the purchase is very easy
                      to make and has great discounts.
                    </p>
                    <div className="testimonial__stars">
                      <i className="ri-star-fill" />
                      <i className="ri-star-fill" />
                      <i className="ri-star-fill" />
                      <i className="ri-star-fill" />
                      <i className="ri-star-half-fill" />
                    </div>
                  </article>
                  <article className="testimonial__card swiper-slide">
                    <img
                      src="assets/img/testimonial-perfil-2.png"
                      alt="image"
                      className="testimonial__img"
                    />
                    <h2 className="testimonial__title">Rial Loz</h2>
                    <p className="testimonial__description">
                      The best website to buy books, the purchase is very easy
                      to make and has great discounts.
                    </p>
                    <div className="testimonial__stars">
                      <i className="ri-star-fill" />
                      <i className="ri-star-fill" />
                      <i className="ri-star-fill" />
                      <i className="ri-star-fill" />
                      <i className="ri-star-half-fill" />
                    </div>
                  </article>
                  <article className="testimonial__card swiper-slide">
                    <img
                      src="assets/img/testimonial-perfil-3.png"
                      alt="image"
                      className="testimonial__img"
                    />
                    <h2 className="testimonial__title">Rial Loz</h2>
                    <p className="testimonial__description">
                      The best website to buy books, the purchase is very easy
                      to make and has great discounts.
                    </p>
                    <div className="testimonial__stars">
                      <i className="ri-star-fill" />
                      <i className="ri-star-fill" />
                      <i className="ri-star-fill" />
                      <i className="ri-star-fill" />
                      <i className="ri-star-half-fill" />
                    </div>
                  </article>
                  <article className="testimonial__card swiper-slide">
                    <img
                      src="assets/img/testimonial-perfil-4.png"
                      alt="image"
                      className="testimonial__img"
                    />
                    <h2 className="testimonial__title">Rial Loz</h2>
                    <p className="testimonial__description">
                      The best website to buy books, the purchase is very easy
                      to make and has great discounts.
                    </p>
                    <div className="testimonial__stars">
                      <i className="ri-star-fill" />
                      <i className="ri-star-fill" />
                      <i className="ri-star-fill" />
                      <i className="ri-star-fill" />
                      <i className="ri-star-half-fill" />
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      {/*==================== FOOTER ====================*/}
      <footer className="footer">
        <div className="footer__container container grid">
          <div>
            <a href="#" className="footer__logo">
              <i className="ri-book-3-line" /> BookVerse
            </a>
            <p className="footer__description">
              Find and explore the best <br />
              eBooks from all your <br />
              favorite writers.
            </p>
          </div>
          <div className="footer__data grid">
            <div>
              <h3 className="footer__title">About</h3>
              <ul className="footer__links">
                <li>
                  <a href="#" className="footer__link">
                    Awards
                  </a>
                </li>
                <li>
                  <a href="#" className="footer__link">
                    FAQs
                  </a>
                </li>
                <li>
                  <a href="#" className="footer__link">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="footer__link">
                    Terms of Services
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="footer__title">Company</h3>
              <ul className="footer__links">
                <li>
                  <a href="#" className="footer__link">
                    Blogs
                  </a>
                </li>
                <li>
                  <a href="#" className="footer__link">
                    Community
                  </a>
                </li>
                <li>
                  <a href="#" className="footer__link">
                    Our Team
                  </a>
                </li>
                <li>
                  <a href="#" className="footer__link">
                    Help Center
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="footer__title">Contact</h3>
              <ul className="footer__links">
                <li>
                  <address className="footer__info">
                    Av. Hacienda <br />
                    Lima 4321, Perú
                  </address>
                </li>
                <li>
                  <address className="footer__info">
                    book.verse@email.com <br />
                    0987-654-321
                  </address>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="footer__title">Social</h3>
              <div className="footer__social">
                <a
                  href="https://www.facebook.com/"
                  target="_blank"
                  className="footer__social-link"
                >
                  <i className="ri-facebook-circle-line" />
                </a>
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  className="footer__social-link"
                >
                  <i className="ri-instagram-line" />
                </a>
                <a
                  href="https://twitter.com/"
                  target="_blank"
                  className="footer__social-link"
                >
                  <i className="ri-twitter-x-line" />
                </a>
              </div>
            </div>
          </div>
        </div>
        <span className="footer__copy">© All Rights Reserved By BookVerse</span>
      </footer>
      {/*========== SCROLL UP ==========*/}
      <a href="#" className="scrollup" id="scroll-up">
        <i className="ri-arrow-up-line" />
      </a>
      {/*=============== SCROLLREVEAL ===============*/}
      {/*=============== SWIPER JS ===============*/}
      {/*=============== MAIN JS ===============*/}
    </>
  );
}

export default App;
