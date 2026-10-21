import { Link, NavLink, useLocation } from "react-router";
import { isLoggedIn } from "../../../utils/auth";
import { useLanguage } from "../../context/languageContext";
import "./Header.css";

const navClass = ({ isActive }) =>
  isActive ? "nav__link active-link" : "nav__link";

export default function Header({ theme, isLight, onSearch }) {
  useLocation();
  const { language, toggleLanguage, t } = useLanguage();

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
                <span>{t("nav.home")}</span>
              </NavLink>
            </li>
            <li className="nav__item">
              <NavLink to="/featured" className={navClass}>
                <i className="ri-book-3-line" />
                <span>{t("nav.bookPicks")}</span>
              </NavLink>
            </li>
            <li className="nav__item">
              <NavLink to="/discount" className={navClass}>
                <i className="ri-price-tag-3-line" />
                <span>{t("nav.discount")}</span>
              </NavLink>
            </li>
            <li className="nav__item">
              <NavLink to="/new" className={navClass}>
                <i className="ri-bookmark-line" />
                <span>{t("nav.newBooks")}</span>
              </NavLink>
            </li>
            <li className="nav__item">
              <NavLink to="/testimonial" className={navClass}>
                <i className="ri-message-3-line" />
                <span>{t("nav.testimonial")}</span>
              </NavLink>
            </li>
          </ul>
        </div>
        <div className="nav__actions">
          <button
            type="button"
            className="nav__lang-toggle"
            onClick={toggleLanguage}
            title={language === "ru" ? "Switch to English" : "Переключить на русский"}
            aria-label={t("nav.language")}
          >
            <span className={language === "ru" ? "nav__lang-item--active" : "nav__lang-item"}>
              RU
            </span>
            <span className="nav__lang-divider">/</span>
            <span className={language === "en" ? "nav__lang-item--active" : "nav__lang-item"}>
              EN
            </span>
          </button>
          <i
            className="ri-search-line search-button"
            id="search-button"
            onClick={onSearch}
            title={t("nav.search")}
          />
          <Link to="/cart" aria-label={t("nav.cart")} title={t("nav.cart")}>
            <i className="ri-shopping-basket-2-line" />
          </Link>
          <Link
            to={isLoggedIn() ? "/profile" : "/login"}
            aria-label={isLoggedIn() ? t("nav.profile") : t("nav.login")}
            title={isLoggedIn() ? t("nav.profile") : t("nav.login")}
          >
            <i className="ri-user-line login-button" id="login-button" />
          </Link>
          <i
            className={`${isLight ? "ri-moon-line" : "ri-sun-line"} change-theme`}
            id="theme-button"
            onClick={theme}
            title={t("nav.theme")}
          />
        </div>
      </nav>
    </header>
  );
}
