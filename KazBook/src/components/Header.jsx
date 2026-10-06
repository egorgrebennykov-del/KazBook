export default function Header({ theme, isLight }) {
  return (
    <header className="header" id="header">
      <nav className="nav container">
        <a href="#" className="nav__logo">
          <img
            src="/assets/img/logo-dark.png"
            alt=""
            className={`nav__logo-image ${isLight ? "fade-out" : "fade-in"}`}
          />
          <img
            src="/assets/img/logo-light.png"
            alt=""
            className={`nav__logo-image ${isLight ? "fade-in" : "fade-out"}`}
          />
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
          <i
            className="ri-moon-line change-theme"
            id="theme-button"
            onClick={theme}
          />
        </div>
      </nav>
    </header>
  );
}
