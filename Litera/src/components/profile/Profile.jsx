import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { getProfile, isLoggedIn, logout } from "../../../utils/auth";
import { useLanguage } from "../../context/languageContext";
import "./Profile.css";

function TruncatedField({ text, className = "", as: Component = "span" }) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const checkOverflow = () => {
      if (!expanded) {
        setIsOverflowing(textEl.scrollWidth > container.clientWidth + 2);
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text, expanded]);

  if (!text) return null;

  const handleClick = (e) => {
    if (isOverflowing || expanded) {
      e.stopPropagation();
      setExpanded((prev) => !prev);
    }
  };

  return (
    <Component
      ref={containerRef}
      className={`profile__truncate ${expanded ? "profile__truncate--expanded" : ""} ${isOverflowing ? "profile__truncate--overflow" : ""} ${className}`}
      onClick={handleClick}
      role={isOverflowing || expanded ? "button" : undefined}
      tabIndex={isOverflowing || expanded ? 0 : undefined}
      onKeyDown={(e) => {
        if ((isOverflowing || expanded) && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          setExpanded((prev) => !prev);
        }
      }}
    >
      <span ref={textRef} className="profile__truncate-text">
        {text}
      </span>
      {isOverflowing && !expanded && (
        <span className="profile__ellipsis" aria-label="Show full text">
          ...
        </span>
      )}
    </Component>
  );
}

export default function Profile() {
  const { t, language } = useLanguage();
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
            <div
              className={`profile__avatar ${profile.role === "privileged" ? "profile__avatar--privileged" : ""}`}
            >
              {initials || "?"}
            </div>
            <div className="profile__name-wrap">
              <TruncatedField
                text={fullName}
                as="h2"
                className="profile__name"
              />
            </div>
            {profile.email && (
              <div className="profile__email-wrap">
                <TruncatedField
                  text={profile.email}
                  as="p"
                  className="profile__email"
                />
              </div>
            )}

            {profile.role === "privileged" && (
              <div className="profile__privileged-badge">
                <i className="ri-vip-crown-fill" />
                <span>
                  {language === "ru" ? "Привилегированный" : "Privileged"}
                </span>
              </div>
            )}

            <dl className="profile__details">
              <div className="profile__row">
                <dt>{t("auth.firstName")}</dt>
                <dd>
                  <TruncatedField text={profile.firstName} />
                </dd>
              </div>
              {profile.lastName && (
                <div className="profile__row">
                  <dt>{t("auth.lastName")}</dt>
                  <dd>
                    <TruncatedField text={profile.lastName} />
                  </dd>
                </div>
              )}
              {profile.email && (
                <div className="profile__row">
                  <dt>{t("auth.email")}</dt>
                  <dd>
                    <TruncatedField text={profile.email} />
                  </dd>
                </div>
              )}
              {profile.phones && profile.phones.length > 0 ? (
                <div className="profile__row">
                  <dt>{t("checkout.phone")}</dt>
                  <dd className="profile__phones-list">
                    {profile.phones.map((ph, idx) => (
                      <div key={ph} className="profile__phone-item">
                        <TruncatedField text={ph} />
                        {idx === 0 && (
                          <span className="profile__phone-tag">
                            {t("checkout.primaryBadge")}
                          </span>
                        )}
                      </div>
                    ))}
                  </dd>
                </div>
              ) : profile.phone ? (
                <div className="profile__row">
                  <dt>{t("checkout.phone")}</dt>
                  <dd>
                    <TruncatedField text={profile.phone} />
                  </dd>
                </div>
              ) : null}
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
