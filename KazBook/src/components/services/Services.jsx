export default function Services() {
  return (
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
  );
}
