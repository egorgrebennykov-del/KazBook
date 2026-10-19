import { Link, NavLink, useLocation } from "react-router";
import { isLoggedIn } from "../../../utils/auth";

const navClass = ({ isActive }) =>
  isActive ? "nav__link active-link" : "nav__link";

export default function Header({ theme, isLight, onSearch }) {
  useLocation();

  return (
    <header className="header" id="header">
      <nav className="nav container">
        <Link to="/" className="nav__logo">
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
        </Link>
        <div className="nav__menu">
          <ul className="nav__list">
            <li className="nav__item">
              <NavLink to="/" end className={navClass}>
                <i className="ri-home-line" />
                <span>Home</span>
              </NavLink>
            </li>
            <li className="nav__item">
              <NavLink to="/featured" className={navClass}>
                <i className="ri-book-3-line" />
                <span>Book Picks</span>
              </NavLink>
            </li>
            <li className="nav__item">
              <NavLink to="/discount" className={navClass}>
                <i className="ri-price-tag-3-line" />
                <span>Discount</span>
              </NavLink>
            </li>
            <li className="nav__item">
              <NavLink to="/new" className={navClass}>
                <i className="ri-bookmark-line" />
                <span>New Books</span>
              </NavLink>
            </li>
            <li className="nav__item">
              <NavLink to="/testimonial" className={navClass}>
                <i className="ri-message-3-line" />
                <span>Testimonial</span>
              </NavLink>
            </li>
          </ul>
        </div>
        <div className="nav__actions">
          <i
            className="ri-search-line search-button"
            id="search-button"
            onClick={onSearch}
          />
          <Link to="/cart" aria-label="Shopping cart" title="Shopping cart">
            <i className="ri-shopping-basket-2-line" />
          </Link>
          <Link to={isLoggedIn() ? "/profile" : "/login"}>
            <i className="ri-user-line login-button" id="login-button" />
          </Link>
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
