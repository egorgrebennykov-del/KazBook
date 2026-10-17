import { Link } from "react-router";
import { isLoggedIn } from "../../../utils/auth";

const navigationLinks = [
  { to: "/", label: "Home" },
  { to: "/featured", label: "Featured" },
  { to: "/discount", label: "Discounts" },
  { to: "/new", label: "New books" },
  { to: "/testimonial", label: "Reviews" },
];

export default function Footer() {
  const accountPath = isLoggedIn() ? "/profile" : "/login";
  const accountLabel = isLoggedIn() ? "Profile" : "Sign in";

  return (
    <footer className="footer">
      <div className="footer__container container">
        <Link to="/" className="footer__brand" aria-label="KazBook home">
          <img
            src="/assets/img/logo-dark.png"
            alt="KazBook"
            className="footer__logo-image"
          />
        </Link>
        <nav className="footer__nav" aria-label="Footer navigation">
          <ul className="footer__links">
            {navigationLinks.map(({ to, label }) => (
              <li key={to}>
                <Link to={to} className="footer__link">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="footer__actions">
          <Link to="/cart" className="footer__action">
            <i className="ri-shopping-basket-2-line" aria-hidden="true" />
            Cart
          </Link>
          <Link to={accountPath} className="footer__action">
            <i className="ri-user-line" aria-hidden="true" />
            {accountLabel}
          </Link>
        </div>
      </div>
      <div className="footer__bottom container">
        <span className="footer__copy">
          © {new Date().getFullYear()} KazBook
        </span>
        <span className="footer__tagline">Books from Kazakhstan to Europe</span>
      </div>
    </footer>
  );
}
