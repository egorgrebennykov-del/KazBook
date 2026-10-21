import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { register } from "../../../utils/auth";
import { useLanguage } from "../../context/languageContext";

export default function SignUp({ onLogin, onClose }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    repeat: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const field = (name) => ({
    value: form[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.repeat) {
      setError(t("auth.passwordsMismatch"));
      return;
    }
    setSubmitting(true);
    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });
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
    <div className="login grid show-login" id="signup-content">
      <form className="login__form grid" onSubmit={handleSubmit}>
        <button
          type="button"
          className="auth-close"
          id="signup-close"
          aria-label="Close sign up"
          onClick={onClose}
        >
          ×
        </button>
        <h3 className="login__title">{t("auth.signUpTitle")}</h3>
        <div className="login__group grid">
          <div>
            <label htmlFor="signup-first-name" className="login__label">
              {t("auth.firstName")}
            </label>
            <input
              type="text"
              placeholder={t("auth.firstNamePlaceholder")}
              id="signup-first-name"
              className="login__input"
              autoComplete="given-name"
              maxLength={100}
              required
              {...field("firstName")}
            />
          </div>
          <div>
            <label htmlFor="signup-last-name" className="login__label">
              {t("auth.lastName")}
            </label>
            <input
              type="text"
              placeholder={t("auth.lastNamePlaceholder")}
              id="signup-last-name"
              className="login__input"
              autoComplete="family-name"
              maxLength={100}
              required
              {...field("lastName")}
            />
          </div>
          <div>
            <label htmlFor="signup-email" className="login__label">
              {t("auth.email")}
            </label>
            <input
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              id="signup-email"
              className="login__input"
              autoComplete="email"
              required
              {...field("email")}
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="login__label">
              {t("auth.password")}
            </label>
            <input
              type="password"
              placeholder={t("auth.passwordPlaceholder")}
              id="signup-password"
              className="login__input"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              {...field("password")}
            />
          </div>
          <div>
            <label htmlFor="signup-repeat-password" className="login__label">
              {t("auth.repeatPassword")}
            </label>
            <input
              type="password"
              placeholder={t("auth.repeatPasswordPlaceholder")}
              id="signup-repeat-password"
              className="login__input"
              autoComplete="new-password"
              required
              {...field("repeat")}
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
            {t("auth.haveAccount")}{" "}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onLogin();
              }}
            >
              {t("auth.loginBtn")}
            </a>
          </span>
          <button
            type="submit"
            className="login__button button"
            disabled={submitting}
          >
            {t("auth.signUpBtn")}
          </button>
        </div>
      </form>
    </div>
  );
}
