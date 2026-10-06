import CarouselControls from "./CarouselControls";

export default function Testimonial() {
  return (
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
                  The best website to buy books, the purchase is very easy to
                  make and has great discounts.
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
                  The best website to buy books, the purchase is very easy to
                  make and has great discounts.
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
                  The best website to buy books, the purchase is very easy to
                  make and has great discounts.
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
                  The best website to buy books, the purchase is very easy to
                  make and has great discounts.
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
  );
}
