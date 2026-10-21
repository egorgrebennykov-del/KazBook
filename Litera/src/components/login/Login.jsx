import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { login } from "../../../utils/auth";
import { useLanguage } from "../../context/languageContext";

export default function Login({ onSignUp, onClose }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      const destination = params.get("redirect");
      navigate(
        destination?.startsWith("/") && !destination.startsWith("//")
          ? destination
          : "/",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login grid show-login" id="login-content">
      <form className="login__form grid" onSubmit={handleSubmit}>
        <button
          type="button"
          className="auth-close"
          id="login-close"
          aria-label="Close login"
          onClick={onClose}
        >
          ×
        </button>
        <h3 className="login__title">{t("auth.loginTitle")}</h3>
        <div className="login__group grid">
          <div>
            <label htmlFor="login-email" className="login__label">
              {t("auth.email")}
            </label>
            <input
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              id="login-email"
              className="login__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label htmlFor="login-pass" className="login__label">
              {t("auth.password")}
            </label>
            <input
              type="password"
              placeholder={t("auth.passwordPlaceholder")}
              id="login-pass"
              className="login__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        </div>
        {error && (
          <p role="alert" style={{ color: "hsl(0, 70%, 50%)" }}>
            {error}
          </p>
        )}
        <div>
          <span className="login__signup">
            {t("auth.noAccount")}{" "}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onSignUp();
              }}
            >
              {t("auth.signUpBtn")}
            </a>
          </span>
          <a href="#" className="login__forgot">
            {t("auth.forgotPassword")}
          </a>
          <button
            type="submit"
            className="login__button button"
            disabled={submitting}
          >
            {t("auth.loginBtn")}
          </button>
        </div>
      </form>
    </div>
  );
}
