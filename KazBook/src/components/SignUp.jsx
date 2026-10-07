export default function SignUp({ onLogin, onClose }) {
  return (
    <div className="login grid show-login" id="signup-content">
      <form action="" className="login__form grid">
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
            <label htmlFor="signup-name" className="login__label">
              Name
            </label>
            <input
              type="text"
              placeholder="Write your name"
              id="signup-name"
              className="login__input"
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
            />
          </div>
        </div>
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
          <button type="submit" className="login__button button">
            Sign Up
          </button>
        </div>
      </form>
    </div>
  );
}
