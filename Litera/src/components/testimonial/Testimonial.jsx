import CarouselControls from "../carouselcontrols/CarouselControls";
import { useLanguage } from "../../context/languageContext";

export default function Testimonial() {
  const { t } = useLanguage();

  const reviews = [
    {
      img: "assets/img/testimonial-perfil-1.png",
      name: "Rial Loz",
      text: t("testimonial.review1"),
    },
    {
      img: "assets/img/testimonial-perfil-2.png",
      name: "Elena M.",
      text: t("testimonial.review2"),
    },
    {
      img: "assets/img/testimonial-perfil-3.png",
      name: "Radu C.",
      text: t("testimonial.review3"),
    },
    {
      img: "assets/img/testimonial-perfil-4.png",
      name: "Sophie T.",
      text: t("testimonial.review4"),
    },
  ];

  return (
    <section className="testimonial section" id="testimonial">
      <h2 className="section__title">{t("testimonial.title")}</h2>
      <div className="testimonial__container container">
        <div className="carousel">
          <CarouselControls />
          <div className="testimonial__swiper swiper">
            <div className="swiper-wrapper">
              {reviews.map((review, idx) => (
                <article className="testimonial__card swiper-slide" key={idx}>
                  <img
                    src={review.img}
                    alt={review.name}
                    className="testimonial__img"
                  />
                  <h2 className="testimonial__title">{review.name}</h2>
                  <p className="testimonial__description">{review.text}</p>
                  <div className="testimonial__stars">
                    <i className="ri-star-fill" />
                    <i className="ri-star-fill" />
                    <i className="ri-star-fill" />
                    <i className="ri-star-fill" />
                    <i className="ri-star-half-fill" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
