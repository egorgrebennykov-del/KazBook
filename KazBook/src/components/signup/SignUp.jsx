import { useState } from "react";
import { useNavigate } from "react-router";
import { register } from "../../../utils/auth";

export default function SignUp({ onLogin, onClose }) {
  const navigate = useNavigate();
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
      setError("Passwords do not match");
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
      navigate("/");
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
        <h3 className="login__title">Sign Up</h3>
        <div className="login__group grid">
          <div>
            <label htmlFor="signup-first-name" className="login__label">
              First name
            </label>
            <input
              type="text"
              placeholder="Write your first name"
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
              Last name
            </label>
            <input
              type="text"
              placeholder="Write your last name"
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
              Email
            </label>
            <input
              type="email"
              placeholder="Write your email"
              id="signup-email"
              className="login__input"
              autoComplete="email"
              required
              {...field("email")}
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="login__label">
              Password
            </label>
            <input
              type="password"
              placeholder="Create a password"
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
              Repeat Password
            </label>
            <input
              type="password"
              placeholder="Repeat your password"
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
            Already have an account?{" "}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onLogin();
              }}
            >
              Log In
            </a>
          </span>
          <button
            type="submit"
            className="login__button button"
            disabled={submitting}
          >
            Sign Up
          </button>
        </div>
      </form>
    </div>
  );
}
