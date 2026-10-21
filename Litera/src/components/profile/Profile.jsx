import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { getProfile, isLoggedIn, logout } from "../../../utils/auth";
import { useLanguage } from "../../context/languageContext";
import "./Profile.css";

export default function Profile() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    getProfile()
      .then((data) => !cancelled && setProfile(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  if (!loggedIn) return <Navigate to="/login" replace />;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const fullName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : "";
  const initials = profile
    ? `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase()
    : "";

  return (
    <section className="profile section container">
      <div className="profile__card">
        {!profile ? (
          <div className="profile__spinner" />
        ) : (
          <>
            <div className="profile__avatar">{initials || "?"}</div>
            <h2 className="profile__name">{fullName}</h2>
            {profile.email && <p className="profile__email">{profile.email}</p>}

            <dl className="profile__details">
              <div className="profile__row">
                <dt>{t("auth.firstName")}</dt>
                <dd>{profile.firstName}</dd>
              </div>
              {profile.lastName && (
                <div className="profile__row">
                  <dt>{t("auth.lastName")}</dt>
                  <dd>{profile.lastName}</dd>
                </div>
              )}
              {profile.email && (
                <div className="profile__row">
                  <dt>{t("auth.email")}</dt>
                  <dd>{profile.email}</dd>
                </div>
              )}
            </dl>

            <button
              type="button"
              className="profile__logout button"
              onClick={handleLogout}
            >
              {t("auth.logout")}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
