import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getProfile, isLoggedIn } from "../../../utils/auth";
import { getFeedbacks, addFeedback } from "../../../utils/feedbacks";
import decodeHtmlEntities from "../../../utils/decodeHtmlEntities";
import { useLanguage } from "../../context/languageContext";
import "./Testimonial.css";

function formatReviewDate(dateString, language) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
}

function getInitials(firstName, lastName) {
  const f = (firstName || "").trim().charAt(0);
  const l = (lastName || "").trim().charAt(0);
  return (f + l).toUpperCase() || "?";
}

export default function Testimonial() {
  const { language, t } = useLanguage();
  const loggedIn = isLoggedIn();
  const [user, setUser] = useState(null);

  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    getFeedbacks()
      .then((items) => {
        if (cancelled) return;
        const sorted = [...items].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        );
        setFeedbacks(sorted);
      })
      .catch((err) => !cancelled && setLoadError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    getProfile()
      .then((profile) => !cancelled && setUser(profile))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const cleanText = text.trim();
    if (!cleanText && (!stars || stars < 1)) {
      setFormError(t("testimonial.validationError"));
      return;
    }

    setSubmitting(true);
    try {
      const inserted = await addFeedback({
        userId: user?.id,
        userFirstName: user?.firstName || "Пользователь",
        userLastName: user?.lastName || "",
        feedback: cleanText,
        stars: stars > 0 ? stars : null,
      });

      if (inserted) {
        setFeedbacks((prev) => [inserted, ...prev]);
      } else {
        // Fallback refetch
        const refreshed = await getFeedbacks();
        setFeedbacks(
          [...refreshed].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at),
          ),
        );
      }

      setText("");
      setStars(0);
      setHoverStars(0);
      setFormSuccess(t("testimonial.success"));
    } catch (err) {
      setFormError(err.message || t("testimonial.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const activeStarCount = hoverStars || stars;

  return (
    <section className="testimonial section container" id="testimonial">
      <div className="testimonial__header-box">
        <h1 className="section__title">{t("testimonial.title")}</h1>
        <p className="testimonial__subtitle">{t("testimonial.subtitle")}</p>
      </div>

      {/* Review submission block */}
      {loggedIn ? (
        <div className="testimonial__form-card">
          <h2 className="testimonial__form-title">
            <i className="ri-chat-new-line" />
            {t("testimonial.leaveReview")}
          </h2>

          {user && (
            <div className="testimonial__user-badge">
              <div className="testimonial__user-avatar">
                {getInitials(user.firstName, user.lastName)}
              </div>
              <div className="testimonial__user-info">
                <span className="testimonial__user-name">
                  {user.firstName} {user.lastName}
                </span>
                {user.email && (
                  <span className="testimonial__user-email">{user.email}</span>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {formError && (
              <div
                className="testimonial__alert testimonial__alert--error"
                role="alert"
              >
                {formError}
              </div>
            )}
            {formSuccess && (
              <div
                className="testimonial__alert testimonial__alert--success"
                role="status"
              >
                {formSuccess}
              </div>
            )}

            {/* 5-star rating selector */}
            <div className="testimonial__rating-group">
              <span className="testimonial__rating-label">
                {t("testimonial.rating")}:
              </span>
              <div
                className="testimonial__stars-picker"
                role="radiogroup"
                aria-label={t("testimonial.rating")}
              >
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={`testimonial__star-btn ${
                      val <= activeStarCount
                        ? "testimonial__star-btn--filled"
                        : ""
                    }`}
                    onClick={() => setStars((current) => (current === val ? 0 : val))}
                    onMouseEnter={() => setHoverStars(val)}
                    onMouseLeave={() => setHoverStars(0)}
                    aria-label={`${val} ${val === 1 ? t("testimonial.star") : t("testimonial.stars")}`}
                  >
                    <i
                      className={
                        val <= activeStarCount
                          ? "ri-star-fill"
                          : "ri-star-line"
                      }
                    />
                  </button>
                ))}
                {stars > 0 && (
                  <>
                    <span className="testimonial__rating-text">
                      {stars} / 5
                    </span>
                    <button
                      type="button"
                      className="testimonial__rating-reset"
                      onClick={() => {
                        setStars(0);
                        setHoverStars(0);
                      }}
                    >
                      {t("testimonial.clearRating")}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Review text area */}
            <div className="testimonial__text-group">
              <label
                htmlFor="testimonial-text"
                className="testimonial__rating-label"
              >
                {t("testimonial.text")}:
              </label>
              <textarea
                id="testimonial-text"
                className="testimonial__textarea"
                rows={4}
                placeholder={t("testimonial.placeholder")}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <div className="testimonial__form-actions">
              <button
                type="submit"
                className="button testimonial__submit-btn"
                disabled={submitting}
              >
                <i className="ri-send-plane-line" />
                {submitting
                  ? t("testimonial.submitting")
                  : t("testimonial.submit")}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="testimonial__guest-card">
          <i className="ri-chat-smile-2-line testimonial__guest-icon" />
          <p className="testimonial__guest-text">
            {t("testimonial.loginRequired")}
          </p>
          <Link
            to="/login?redirect=%2Ftestimonial"
            className="button"
          >
            {t("testimonial.loginBtn")}
          </Link>
        </div>
      )}

      {/* Reviews list sorted by date */}
      <div className="testimonial__list-section">
        <h2 className="testimonial__list-title">
          <span>{t("testimonial.title")}</span>
          {feedbacks.length > 0 && (
            <span className="testimonial__list-count">
              ({feedbacks.length})
            </span>
          )}
        </h2>

        {loading && (
          <div className="testimonial__state" role="status">
            <div className="testimonial__spinner" />
            <p>{t("testimonial.loading")}</p>
          </div>
        )}

        {!loading && loadError && (
          <div className="testimonial__state" role="alert">
            <i className="ri-error-warning-line testimonial__state-icon" />
            <p>{t("testimonial.error")}</p>
          </div>
        )}

        {!loading && !loadError && feedbacks.length === 0 && (
          <div className="testimonial__state">
            <i className="ri-chat-voice-line testimonial__state-icon" />
            <p>{t("testimonial.empty")}</p>
          </div>
        )}

        {!loading && !loadError && feedbacks.length > 0 && (
          <div className="testimonial__reviews-grid">
            {feedbacks.map((item) => {
              const authorName = [item.user_first_name, item.user_last_name]
                .filter(Boolean)
                .join(" ") || t("testimonial.anonymous");
              const initials = getInitials(
                item.user_first_name,
                item.user_last_name,
              );
              const rating = Number(item.stars);
              const hasRating = Number.isInteger(rating) && rating >= 1 && rating <= 5;
              const feedbackText = decodeHtmlEntities(item.feedback || "");

              return (
                <article className="testimonial__review-card" key={item.id}>
                  <header className="testimonial__review-header">
                    <div className="testimonial__author-box">
                      <div className="testimonial__author-avatar" aria-hidden="true">
                        {initials}
                      </div>
                      <div className="testimonial__author-meta">
                        <span className="testimonial__author-name">
                          {authorName}
                        </span>
                        {item.created_at && (
                          <time
                            className="testimonial__date"
                            dateTime={item.created_at}
                            title={new Date(item.created_at).toISOString()}
                          >
                            <i className="ri-calendar-line" />
                            {formatReviewDate(item.created_at, language)}
                          </time>
                        )}
                      </div>
                    </div>

                    {hasRating && (
                      <div
                        className="testimonial__review-stars"
                        aria-label={`${rating} / 5`}
                        title={`${rating} / 5`}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <i
                            key={star}
                            className={
                              star <= rating
                                ? "ri-star-fill"
                                : "ri-star-line testimonial__star-empty"
                            }
                          />
                        ))}
                      </div>
                    )}
                  </header>

                  {feedbackText && (
                    <p className="testimonial__review-text">{feedbackText}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
