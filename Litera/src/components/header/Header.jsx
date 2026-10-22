import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { getCookieUser, isLoggedIn, logout } from "../../../utils/auth";
import { useLanguage } from "../../context/languageContext";
import "./Header.css";

const navClass = ({ isActive }) =>
  isActive ? "nav__link active-link" : "nav__link";

export default function Header({ theme, isLight, onSearch }) {
  const navigate = useNavigate();
  const { language, toggleLanguage, t } = useLanguage();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const loggedIn = isLoggedIn();
  const user = getCookieUser();

  useEffect(() => {
    const handleOutside = (e) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, []);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
    navigate("/");
  };

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

          {loggedIn ? (
            <div className="nav__profile-wrap" ref={profileMenuRef}>
              <button
                type="button"
                className={`nav__profile-btn ${isDropdownOpen ? "nav__profile-btn--open" : ""}`}
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                aria-expanded={isDropdownOpen}
                aria-haspopup="menu"
                aria-label={t("nav.profile")}
                title={t("nav.profile")}
              >
                <i className="ri-user-line login-button" id="login-button" />
              </button>

              {isDropdownOpen && (
                <div className="nav__profile-dropdown" role="menu">
                  {user?.firstName && (
                    <div className="nav__profile-header">
                      <span className="nav__profile-welcome">
                        {language === "ru" ? "Здравствуйте," : "Hello,"}
                      </span>
                      <span className="nav__profile-name">{user.firstName}</span>
                    </div>
                  )}
                  <ul className="nav__profile-menu">
                    <li className="nav__profile-item" role="none">
                      <Link
                        to="/profile"
                        role="menuitem"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <i className="ri-user-3-line" />
                        <span>{t("nav.profile")}</span>
                      </Link>
                    </li>
                    <li className="nav__profile-item" role="none">
                      <Link
                        to="/orders/current"
                        role="menuitem"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <i className="ri-time-line" />
                        <span>{t("nav.currentOrders")}</span>
                      </Link>
                    </li>
                    <li className="nav__profile-item" role="none">
                      <Link
                        to="/orders/completed"
                        role="menuitem"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <i className="ri-checkbox-circle-line" />
                        <span>{t("nav.completedOrders")}</span>
                      </Link>
                    </li>
                    <li className="nav__profile-divider" role="separator" />
                    <li className="nav__profile-item" role="none">
                      <button
                        type="button"
                        role="menuitem"
                        className="nav__profile-logout-btn"
                        onClick={handleLogout}
                      >
                        <i className="ri-logout-box-r-line" />
                        <span>{t("nav.logout")}</span>
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              aria-label={t("nav.login")}
              title={t("nav.login")}
            >
              <i className="ri-user-line login-button" id="login-button" />
            </Link>
          )}

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
