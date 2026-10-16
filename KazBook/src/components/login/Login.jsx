import { useState } from "react";
import { useNavigate } from "react-router";
import { login } from "../../../utils/auth";

export default function Login({ onSignUp, onClose }) {
  const navigate = useNavigate();
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
      navigate("/");
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
        <h3 className="login__title">Log In</h3>
        <div className="login__group grid">
          <div>
            <label htmlFor="login-email" className="login__label">
              Email
            </label>
            <input
              type="email"
              placeholder="Write your email"
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
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
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
            You do not have an account?{" "}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onSignUp();
              }}
            >
              Sign Up
            </a>
          </span>
          <a href="#" className="login__forgot">
            You forgot your password
          </a>
          <button
            type="submit"
            className="login__button button"
            disabled={submitting}
          >
            Log In
          </button>
        </div>
      </form>
    </div>
  );
}
