export default function Join() {
  return (
    <section className="join section">
      <div className="join__container">
        <img src="assets/img/join-bg.jpg" alt="image" className="join__bg" />
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
  );
}
