export default function Discount() {
  return (
    <section className="discount section" id="discount">
      <div className="discount__container container grid">
        <div className="discount__data">
          <h2 className="discount__title section__title">Up To 50% Discount</h2>
          <p className="discount__description">
            Take advantage of the discount days we have for you, buy books from
            your favorite writers, the more you buy, the more discounts we have
            for you.
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
  );
}
