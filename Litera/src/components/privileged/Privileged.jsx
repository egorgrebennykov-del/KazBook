import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { getAllUsers, getCookieUser, getProfile, isLoggedIn, updateUserRole } from "../../../utils/auth";
import { getAllOrdersAdmin, updateOrderStatus } from "../../../utils/orders";
import { createCoupon, deleteCoupon, getAllCoupons } from "../../../utils/coupons";
import BookImage from "../common/BookImage";
import decodeHtmlEntities from "../../../utils/decodeHtmlEntities";
import { useLanguage } from "../../context/languageContext";
import "./Privileged.css";

function formatPrice(price, currency = "EUR", language = "ru") {
  const locale = language === "ru" ? "ru-RU" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: currency === "EUR" ? 2 : 0,
  }).format(price || 0);
}

function formatDate(dateString, language = "ru") {
  if (!dateString) return "";
  try {
    const locale = language === "ru" ? "ru-RU" : "en-US";
    return new Date(dateString).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export default function Privileged() {
  const { language, t } = useLanguage();
  const loggedIn = isLoggedIn();
  const cookieUser = getCookieUser();

  const [checkingAuth, setCheckingAuth] = useState(!loggedIn ? false : cookieUser?.role !== "privileged");
  const [isPrivilegedUser, setIsPrivilegedUser] = useState(
    cookieUser?.role === "privileged",
  );

  const [activeSection, setActiveSection] = useState("users");
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [actionNotice, setActionNotice] = useState(null);

  // New coupon form state
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponName, setCouponName] = useState("");
  const [couponDiscount, setCouponDiscount] = useState("10");
  const [couponDays, setCouponDays] = useState("30");
  const [couponSubmitting, setCouponSubmitting] = useState(false);

  // Check auth and verify privileged role
  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    getProfile()
      .then((p) => {
        if (cancelled) return;
        if (p?.role === "privileged") {
          setIsPrivilegedUser(true);
        } else {
          setIsPrivilegedUser(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsPrivilegedUser(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingAuth(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  // Load section data
  useEffect(() => {
    if (!isPrivilegedUser) return;
    let cancelled = false;

    Promise.all([
      getAllUsers(),
      getAllOrdersAdmin(),
      getAllCoupons(),
    ])
      .then(([usersList, ordersList, couponsList]) => {
        if (!cancelled) {
          setUsers(usersList);
          setOrders(ordersList);
          setCoupons(couponsList);
        }
      })
      .catch((err) => {
        console.error("Error loading dashboard data:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [isPrivilegedUser]);

  const handleRefresh = async () => {
    setLoadingData(true);
    try {
      const [usersList, ordersList, couponsList] = await Promise.all([
        getAllUsers(),
        getAllOrdersAdmin(),
        getAllCoupons(),
      ]);
      setUsers(usersList);
      setOrders(ordersList);
      setCoupons(couponsList);
    } catch (err) {
      console.error("Error refreshing data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const showNotice = (msg, isError = false) => {
    setActionNotice({ msg, isError });
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleToggleUserRole = async (targetUser) => {
    const isTargetPrivileged = targetUser.role === "privileged";
    const nextRole = isTargetPrivileged ? "user" : "privileged";
    try {
      await updateUserRole(targetUser.id, nextRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: nextRole } : u)),
      );
      showNotice(
        isTargetPrivileged
          ? `${t("privileged.users.noticeRevoked")} ${targetUser.email}`
          : language === "ru"
            ? `Пользователь ${targetUser.email} ${t("privileged.users.noticeGranted")}`
            : `User ${targetUser.email} ${t("privileged.users.noticeGranted")}`,
      );
    } catch (err) {
      showNotice(err.message, true);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
      const statusLabel =
        newStatus === "completed"
          ? t("privileged.orders.statusCompleted")
          : t("privileged.orders.statusInProgress");
      showNotice(`${t("privileged.orders.statusUpdated")} "${statusLabel}"`);
    } catch (err) {
      showNotice(err.message, true);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponSubmitting(true);
    try {
      const now = new Date();
      const endsAt = new Date();
      endsAt.setDate(now.getDate() + (Number(couponDays) || 30));

      const newCoupon = await createCoupon({
        code: couponCode.trim(),
        name: couponName.trim(),
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        action: {
          type: "discount",
          percent: Number(couponDiscount) || 10,
        },
      });

      setCoupons((prev) => [newCoupon, ...prev]);
      setShowCouponModal(false);
      setCouponCode("");
      setCouponName("");
      showNotice(
        language === "ru"
          ? `Купон ${newCoupon.code} ${t("privileged.coupons.created")}`
          : `Coupon ${newCoupon.code} ${t("privileged.coupons.created")}`,
      );
    } catch (err) {
      showNotice(err.message, true);
    } finally {
      setCouponSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (id, code) => {
    const confirmMsg = `${t("privileged.coupons.confirmDelete")} ${code}?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await deleteCoupon(id);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      showNotice(
        language === "ru"
          ? `Купон ${code} ${t("privileged.coupons.deleted")}`
          : `Coupon ${code} ${t("privileged.coupons.deleted")}`,
      );
    } catch (err) {
      showNotice(err.message, true);
    }
  };

  if (checkingAuth) {
    return (
      <section className="privileged section container">
        <div className="privileged__spinner-wrap">
          <div className="privileged__spinner" />
          <p>{t("privileged.checkingAuth")}</p>
        </div>
      </section>
    );
  }

  if (!loggedIn || !isPrivilegedUser) {
    return <Navigate to="/" replace />;
  }

  const privilegedUsers = users.filter((u) => u.role === "privileged");

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
    const email = (u.email || "").toLowerCase();
    const phone = (Array.isArray(u.phone) ? u.phone.join(" ") : u.phone || "").toLowerCase();
    return name.includes(q) || email.includes(q) || phone.includes(q);
  });

  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter === "all") return true;
    const s = (o.status || "in_progress").toLowerCase();
    return s === orderStatusFilter;
  });

  return (
    <section className="privileged section container">
      {actionNotice && (
        <div
          className={`privileged__notice ${actionNotice.isError ? "privileged__notice--error" : "privileged__notice--success"}`}
          role="alert"
        >
          <i
            className={
              actionNotice.isError
                ? "ri-error-warning-line"
                : "ri-checkbox-circle-line"
            }
          />
          <span>{actionNotice.msg}</span>
        </div>
      )}

      <div className="privileged__header">
        <div>
          <div className="privileged__badge-row">
            <span className="privileged__role-badge">
              <i className="ri-shield-check-line" />
              {t("privileged.badge")}
            </span>
          </div>
          <h1 className="privileged__title">{t("privileged.title")}</h1>
          <p className="privileged__subtitle">
            {t("privileged.subtitle")}
          </p>
        </div>

        <button
          type="button"
          className="button button--ghost privileged__refresh-btn"
          onClick={handleRefresh}
          disabled={loadingData}
          title={t("privileged.refreshTitle")}
        >
          <i
            className={`ri-refresh-line ${loadingData ? "privileged__spin" : ""}`}
          />
          {t("privileged.refresh")}
        </button>
      </div>

      {/* 5 Requested Buttons/Tabs */}
      <div className="privileged__nav-buttons" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "users"}
          className={`privileged__nav-btn ${activeSection === "users" ? "privileged__nav-btn--active" : ""}`}
          onClick={() => setActiveSection("users")}
        >
          <i className="ri-user-line" />
          <span>{t("privileged.tabs.users")}</span>
          <span className="privileged__nav-count">{users.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "privileged"}
          className={`privileged__nav-btn ${activeSection === "privileged" ? "privileged__nav-btn--active" : ""}`}
          onClick={() => setActiveSection("privileged")}
        >
          <i className="ri-vip-crown-line" />
          <span>{t("privileged.tabs.privileged")}</span>
          <span className="privileged__nav-count privileged__nav-count--star">
            {privilegedUsers.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "coupons"}
          className={`privileged__nav-btn ${activeSection === "coupons" ? "privileged__nav-btn--active" : ""}`}
          onClick={() => setActiveSection("coupons")}
        >
          <i className="ri-coupon-3-line" />
          <span>{t("privileged.tabs.coupons")}</span>
          <span className="privileged__nav-count">{coupons.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "orders"}
          className={`privileged__nav-btn ${activeSection === "orders" ? "privileged__nav-btn--active" : ""}`}
          onClick={() => setActiveSection("orders")}
        >
          <i className="ri-shopping-bag-3-line" />
          <span>{t("privileged.tabs.orders")}</span>
          <span className="privileged__nav-count">{orders.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "git-actions"}
          className={`privileged__nav-btn ${activeSection === "git-actions" ? "privileged__nav-btn--active" : ""}`}
          onClick={() => setActiveSection("git-actions")}
        >
          <i className="ri-github-fill" />
          <span>{t("privileged.tabs.gitActions")}</span>
          <i className="ri-external-link-line privileged__ext-icon" />
        </button>
      </div>

      {/* Content Area */}
      <div className="privileged__content">
        {/* SECTION 1: ПОЛЬЗОВАТЕЛИ */}
        {activeSection === "users" && (
          <div className="privileged__panel">
            <div className="privileged__panel-header">
              <div className="privileged__search-box">
                <i className="ri-search-line" />
                <input
                  type="text"
                  placeholder={t("privileged.users.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="privileged__search-clear"
                    onClick={() => setSearchQuery("")}
                  >
                    ×
                  </button>
                )}
              </div>
              <span className="privileged__stats-text">
                {t("privileged.users.found")} <strong>{filteredUsers.length}</strong>
              </span>
            </div>

            <div className="privileged__table-wrap">
              <table className="privileged__table">
                <thead>
                  <tr>
                    <th>{t("privileged.users.thUser")}</th>
                    <th>{t("privileged.users.thEmail")}</th>
                    <th>{t("privileged.users.thPhone")}</th>
                    <th>{t("privileged.users.thRegistered")}</th>
                    <th>{t("privileged.users.thRole")}</th>
                    <th>{t("privileged.users.thAction")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const isPriv = u.role === "privileged";
                    const phones = Array.isArray(u.phone)
                      ? u.phone
                      : u.phone
                        ? [u.phone]
                        : [];
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="privileged__user-cell">
                            <div
                              className={`privileged__user-avatar ${isPriv ? "privileged__user-avatar--star" : ""}`}
                            >
                              {(u.firstName?.[0] || "?").toUpperCase()}
                            </div>
                            <div>
                              <strong className="privileged__user-name">
                                {u.firstName} {u.lastName}
                              </strong>
                              <span className="privileged__user-id">{u.id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <a
                            href={`mailto:${u.email}`}
                            className="privileged__link"
                          >
                            {u.email}
                          </a>
                        </td>
                        <td>
                          {phones.length > 0 ? (
                            <div className="privileged__phone-cell">
                              {phones.map((p) => (
                                <span key={p} className="privileged__phone-tag">
                                  {p}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="privileged__muted">—</span>
                          )}
                        </td>
                        <td>{formatDate(u.created_at, language)}</td>
                        <td>
                          <span
                            className={`privileged__role-pill ${isPriv ? "privileged__role-pill--privileged" : "privileged__role-pill--user"}`}
                          >
                            {isPriv ? "privileged" : "user"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`button privileged__btn-sm ${isPriv ? "button--ghost" : ""}`}
                            onClick={() => handleToggleUserRole(u)}
                            title={
                              isPriv
                                ? t("privileged.users.revokeTitle")
                                : t("privileged.users.makeTitle")
                            }
                          >
                            {isPriv ? (
                              <>
                                <i className="ri-user-unfollow-line" />
                                {t("privileged.users.revokePrivileges")}
                              </>
                            ) : (
                              <>
                                <i className="ri-vip-crown-line" />
                                {t("privileged.users.makePrivileged")}
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="privileged__no-data">
                        {t("privileged.users.empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 2: ПРИВИЛЕГИРОВАННЫЕ ПОЛЬЗОВАТЕЛИ */}
        {activeSection === "privileged" && (
          <div className="privileged__panel">
            <div className="privileged__panel-header">
              <h2 className="privileged__panel-title">
                <i className="ri-vip-crown-fill" />
                {t("privileged.privilegedUsers.title")} ({privilegedUsers.length})
              </h2>
              <span className="privileged__stats-text">
                {t("privileged.privilegedUsers.subtitle")}
              </span>
            </div>

            <div className="privileged__grid">
              {privilegedUsers.map((u) => {
                const phones = Array.isArray(u.phone)
                  ? u.phone
                  : u.phone
                    ? [u.phone]
                    : [];
                return (
                  <div className="privileged__user-card" key={u.id}>
                    <div className="privileged__user-card-head">
                      <div className="privileged__user-avatar privileged__user-avatar--star">
                        {(u.firstName?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="privileged__user-card-info">
                        <strong className="privileged__user-name">
                          {u.firstName} {u.lastName}
                        </strong>
                        <span className="privileged__role-pill privileged__role-pill--privileged">
                          privileged
                        </span>
                      </div>
                    </div>

                    <div className="privileged__user-card-details">
                      <div className="privileged__card-row">
                        <span>{t("privileged.privilegedUsers.email")}</span>
                        <a href={`mailto:${u.email}`} className="privileged__link">
                          {u.email}
                        </a>
                      </div>
                      <div className="privileged__card-row">
                        <span>{t("privileged.privilegedUsers.phones")}</span>
                        <span>{phones.join(", ") || "—"}</span>
                      </div>
                      <div className="privileged__card-row">
                        <span>{t("privileged.privilegedUsers.registered")}</span>
                        <span>{formatDate(u.created_at, language)}</span>
                      </div>
                      <div className="privileged__card-row">
                        <span>{t("privileged.privilegedUsers.id")}</span>
                        <code className="privileged__code">{u.id}</code>
                      </div>
                    </div>

                    <div className="privileged__user-card-actions">
                      <button
                        type="button"
                        className="button button--ghost privileged__btn-sm"
                        onClick={() => handleToggleUserRole(u)}
                      >
                        <i className="ri-close-circle-line" />
                        {t("privileged.privilegedUsers.revokeBtn")}
                      </button>
                    </div>
                  </div>
                );
              })}
              {privilegedUsers.length === 0 && (
                <div className="privileged__empty-box">
                  <p>{t("privileged.privilegedUsers.empty")}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 3: КУПОНЫ */}
        {activeSection === "coupons" && (
          <div className="privileged__panel">
            <div className="privileged__panel-header">
              <div>
                <h2 className="privileged__panel-title">
                  <i className="ri-coupon-3-line" />
                  {t("privileged.coupons.title")}
                </h2>
                <span className="privileged__stats-text">
                  {t("privileged.coupons.total")} {coupons.length}
                </span>
              </div>
              <button
                type="button"
                className="button privileged__create-btn"
                onClick={() => setShowCouponModal(true)}
              >
                <i className="ri-add-line" />
                {t("privileged.coupons.createBtn")}
              </button>
            </div>

            {/* Coupons list */}
            <div className="privileged__coupons-grid">
              {coupons.map((coupon) => {
                const action = coupon.action || {};
                const discount = action.percent
                  ? `${action.percent}%`
                  : action.amount
                    ? `${action.amount} €`
                    : t("privileged.coupons.discountFallback");
                const isExpired =
                  coupon.ends_at && new Date(coupon.ends_at) < new Date();

                return (
                  <div
                    className={`privileged__coupon-card ${isExpired ? "privileged__coupon-card--expired" : ""}`}
                    key={coupon.id}
                  >
                    <div className="privileged__coupon-ticket">
                      <div className="privileged__coupon-code">
                        {coupon.code}
                      </div>
                      <div className="privileged__coupon-discount">
                        {discount}
                      </div>
                    </div>
                    <div className="privileged__coupon-body">
                      <strong className="privileged__coupon-name">
                        {coupon.name || t("privileged.coupons.nameFallback")}
                      </strong>
                      <div className="privileged__coupon-meta">
                        <span>
                          {t("privileged.coupons.validUntil")}{" "}
                          <strong>
                            {coupon.ends_at
                              ? formatDate(coupon.ends_at, language)
                              : t("privileged.coupons.indefinite")}
                          </strong>
                        </span>
                        {isExpired && (
                          <span className="privileged__expired-badge">
                            {t("privileged.coupons.expired")}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="privileged__coupon-delete-btn"
                        onClick={() =>
                          handleDeleteCoupon(coupon.id, coupon.code)
                        }
                        title={t("privileged.coupons.deleteTitle")}
                      >
                        <i className="ri-delete-bin-line" />
                        {t("privileged.coupons.deleteBtn")}
                      </button>
                    </div>
                  </div>
                );
              })}
              {coupons.length === 0 && (
                <div className="privileged__empty-box">
                  <i className="ri-ticket-2-line privileged__empty-icon" />
                  <p>{t("privileged.coupons.empty")}</p>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => setShowCouponModal(true)}
                  >
                    <i className="ri-add-line" />
                    {t("privileged.coupons.createFirst")}
                  </button>
                </div>
              )}
            </div>

            {/* Create Coupon Modal */}
            {showCouponModal && (
              <div
                className="privileged__modal-backdrop"
                onClick={() => setShowCouponModal(false)}
              >
                <div
                  className="privileged__modal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="privileged__modal-header">
                    <h3>
                      <i className="ri-coupon-3-line" />
                      {t("privileged.coupons.modalTitle")}
                    </h3>
                    <button
                      type="button"
                      className="privileged__modal-close"
                      onClick={() => setShowCouponModal(false)}
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={handleCreateCoupon}>
                    <div className="privileged__form-field">
                      <label htmlFor="couponCode">{t("privileged.coupons.codeLabel")}</label>
                      <input
                        id="couponCode"
                        type="text"
                        placeholder={t("privileged.coupons.codePlaceholder")}
                        required
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="privileged__form-field">
                      <label htmlFor="couponName">{t("privileged.coupons.descLabel")}</label>
                      <input
                        id="couponName"
                        type="text"
                        placeholder={t("privileged.coupons.descPlaceholder")}
                        value={couponName}
                        onChange={(e) => setCouponName(e.target.value)}
                      />
                    </div>
                    <div className="privileged__form-row">
                      <div className="privileged__form-field">
                        <label htmlFor="couponDiscount">{t("privileged.coupons.discountPercentLabel")}</label>
                        <input
                          id="couponDiscount"
                          type="number"
                          min="1"
                          max="90"
                          value={couponDiscount}
                          onChange={(e) => setCouponDiscount(e.target.value)}
                          required
                        />
                      </div>
                      <div className="privileged__form-field">
                        <label htmlFor="couponDays">{t("privileged.coupons.durationLabel")}</label>
                        <input
                          id="couponDays"
                          type="number"
                          min="1"
                          max="365"
                          value={couponDays}
                          onChange={(e) => setCouponDays(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="privileged__modal-actions">
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => setShowCouponModal(false)}
                      >
                        {t("privileged.coupons.cancel")}
                      </button>
                      <button
                        type="submit"
                        className="button"
                        disabled={couponSubmitting}
                      >
                        {couponSubmitting
                          ? t("privileged.coupons.submitting")
                          : t("privileged.coupons.submit")}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: ЗАКАЗЫ */}
        {activeSection === "orders" && (
          <div className="privileged__panel">
            <div className="privileged__panel-header">
              <div>
                <h2 className="privileged__panel-title">
                  <i className="ri-shopping-bag-3-line" />
                  {t("privileged.orders.title")}
                </h2>
                <span className="privileged__stats-text">
                  {t("privileged.orders.total")} {orders.length}
                </span>
              </div>

              <div className="privileged__order-filters">
                <button
                  type="button"
                  className={`privileged__filter-pill ${orderStatusFilter === "all" ? "privileged__filter-pill--active" : ""}`}
                  onClick={() => setOrderStatusFilter("all")}
                >
                  {t("privileged.orders.filterAll")} ({orders.length})
                </button>
                <button
                  type="button"
                  className={`privileged__filter-pill ${orderStatusFilter === "in_progress" ? "privileged__filter-pill--active" : ""}`}
                  onClick={() => setOrderStatusFilter("in_progress")}
                >
                  {t("privileged.orders.filterInProgress")} (
                  {
                    orders.filter(
                      (o) => (o.status || "in_progress").toLowerCase() === "in_progress",
                    ).length
                  }
                  )
                </button>
                <button
                  type="button"
                  className={`privileged__filter-pill ${orderStatusFilter === "completed" ? "privileged__filter-pill--active" : ""}`}
                  onClick={() => setOrderStatusFilter("completed")}
                >
                  {t("privileged.orders.filterCompleted")} (
                  {
                    orders.filter(
                      (o) => (o.status || "").toLowerCase() === "completed",
                    ).length
                  }
                  )
                </button>
              </div>
            </div>

            <div className="privileged__orders-list">
              {filteredOrders.map((order) => {
                const content = order.content || {};
                const items = Array.isArray(content.items) ? content.items : [];
                const address = content.address || {};
                const orderNum = content.orderNumber || order.id?.slice(0, 8);
                const isCompleted = (order.status || "").toLowerCase() === "completed";

                return (
                  <div className="privileged__order-card" key={order.id}>
                    <div className="privileged__order-card-header">
                      <div className="privileged__order-meta">
                        <span className="privileged__order-num">
                          {t("privileged.orders.order")} <strong>#{orderNum}</strong>
                        </span>
                        <span className="privileged__order-date">
                          {formatDate(order.created_at || content.createdAt, language)}
                        </span>
                        <span className="privileged__order-user-id">
                          {t("privileged.orders.userId")} {order.user_id}
                        </span>
                      </div>

                      <div className="privileged__order-status-actions">
                        <span
                          className={`privileged__status-badge ${isCompleted ? "privileged__status-badge--completed" : "privileged__status-badge--in-progress"}`}
                        >
                          <i
                            className={
                              isCompleted
                                ? "ri-checkbox-circle-fill"
                                : "ri-time-line"
                            }
                          />
                          {isCompleted
                            ? t("privileged.orders.statusCompleted")
                            : t("privileged.orders.statusInProgress")}
                        </span>

                        <button
                          type="button"
                          className="button button--ghost privileged__btn-sm"
                          onClick={() =>
                            handleUpdateOrderStatus(
                              order.id,
                              isCompleted ? "in_progress" : "completed",
                            )
                          }
                          title={t("privileged.orders.toggleStatusTitle")}
                        >
                          <i className="ri-swap-line" />
                          {isCompleted
                            ? t("privileged.orders.markInProgress")
                            : t("privileged.orders.markCompleted")}
                        </button>
                      </div>
                    </div>

                    {/* Address & Contact info */}
                    <div className="privileged__order-details-grid">
                      <div className="privileged__order-section">
                        <span className="privileged__detail-label">
                          <i className="ri-map-pin-line" /> {t("privileged.orders.deliveryAddress")}
                        </span>
                        <p className="privileged__detail-text">
                          {address.recipientName && (
                            <strong>{address.recipientName}, </strong>
                          )}
                          {address.street}, {address.city}
                          {address.country ? `, ${address.country}` : ""}
                          {address.postalCode ? ` (${address.postalCode})` : ""}
                        </p>
                        {address.phone && (
                          <span className="privileged__detail-phone">
                            <i className="ri-phone-line" /> {address.phone}
                          </span>
                        )}
                      </div>

                      <div className="privileged__order-section privileged__order-section--price">
                        <span className="privileged__detail-label">
                          <i className="ri-money-euro-circle-line" /> {t("privileged.orders.totalPrice")}
                        </span>
                        <strong className="privileged__order-final-price">
                          {formatPrice(
                            content.finalTotal || content.itemsSubtotal || 0,
                            "EUR",
                            language,
                          )}
                        </strong>
                        <small className="privileged__detail-shipping">
                          ({t("privileged.orders.booksSubtotal")} {formatPrice(content.itemsSubtotal || 0, "EUR", language)}, {t("privileged.orders.shippingCost")} {formatPrice(content.shippingCost || 0, "EUR", language)})
                        </small>
                      </div>
                    </div>

                    {/* Items */}
                    {items.length > 0 && (
                      <div className="privileged__order-items">
                        {items.map((item, idx) => (
                          <div className="privileged__order-item" key={item.id || idx}>
                            <BookImage
                              className="privileged__item-thumb"
                              src={item.image}
                              alt={item.title}
                            />
                            <div className="privileged__item-info">
                              <span className="privileged__item-title">
                                {decodeHtmlEntities(item.title)}
                              </span>
                              <span className="privileged__item-qty">
                                {item.quantity} {t("privileged.orders.pcs")} × {formatPrice(item.price, "EUR", language)}
                              </span>
                            </div>
                            <span className="privileged__item-total">
                              {formatPrice(
                                (Number(item.price) || 0) * (Number(item.quantity) || 1),
                                "EUR",
                                language,
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredOrders.length === 0 && (
                <div className="privileged__empty-box">
                  <i className="ri-inbox-line privileged__empty-icon" />
                  <p>{t("privileged.orders.empty")}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 5: GIT ACTIONS */}
        {activeSection === "git-actions" && (
          <div className="privileged__panel">
            <div className="privileged__panel-header">
              <div>
                <h2 className="privileged__panel-title">
                  <i className="ri-github-fill" />
                  {t("privileged.gitActions.title")}
                </h2>
                <span className="privileged__stats-text">
                  {t("privileged.gitActions.subtitle")}
                </span>
              </div>

              <a
                href="https://github.com/egorgrebennykov-del/KazBook/actions"
                target="_blank"
                rel="noopener noreferrer"
                className="button privileged__github-btn"
              >
                <i className="ri-github-fill" />
                {t("privileged.gitActions.openGithub")}
              </a>
            </div>

            <div className="privileged__workflows-grid">
              <div className="privileged__workflow-card">
                <div className="privileged__wf-icon-wrap">
                  <i className="ri-book-3-line" />
                </div>
                <div className="privileged__wf-content">
                  <strong className="privileged__wf-title">
                    Update Book Picks
                  </strong>
                  <span className="privileged__wf-file">
                    .github/workflows/update-book-picks.yml
                  </span>
                  <p className="privileged__wf-desc">
                    {t("privileged.gitActions.wfBookPicksDesc")}
                  </p>
                </div>
                <a
                  href="https://github.com/egorgrebennykov-del/KazBook/actions/workflows/update-book-picks.yml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--ghost privileged__btn-sm"
                >
                  {t("privileged.gitActions.runCheck")}
                </a>
              </div>

              <div className="privileged__workflow-card">
                <div className="privileged__wf-icon-wrap">
                  <i className="ri-home-4-line" />
                </div>
                <div className="privileged__wf-content">
                  <strong className="privileged__wf-title">
                    Update Homepage Books
                  </strong>
                  <span className="privileged__wf-file">
                    .github/workflows/update-home-books.yml
                  </span>
                  <p className="privileged__wf-desc">
                    {t("privileged.gitActions.wfHomeBooksDesc")}
                  </p>
                </div>
                <a
                  href="https://github.com/egorgrebennykov-del/KazBook/actions/workflows/update-home-books.yml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--ghost privileged__btn-sm"
                >
                  {t("privileged.gitActions.runCheck")}
                </a>
              </div>

              <div className="privileged__workflow-card">
                <div className="privileged__wf-icon-wrap">
                  <i className="ri-bookmark-line" />
                </div>
                <div className="privileged__wf-content">
                  <strong className="privileged__wf-title">
                    Update New Books
                  </strong>
                  <span className="privileged__wf-file">
                    .github/workflows/update-new-books.yml
                  </span>
                  <p className="privileged__wf-desc">
                    {t("privileged.gitActions.wfNewBooksDesc")}
                  </p>
                </div>
                <a
                  href="https://github.com/egorgrebennykov-del/KazBook/actions/workflows/update-new-books.yml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--ghost privileged__btn-sm"
                >
                  {t("privileged.gitActions.runCheck")}
                </a>
              </div>

              <div className="privileged__workflow-card">
                <div className="privileged__wf-icon-wrap">
                  <i className="ri-exchange-dollar-line" />
                </div>
                <div className="privileged__wf-content">
                  <strong className="privileged__wf-title">
                    Update Exchange Rate
                  </strong>
                  <span className="privileged__wf-file">
                    .github/workflows/update-exchange-rate.yml
                  </span>
                  <p className="privileged__wf-desc">
                    {t("privileged.gitActions.wfExchangeRateDesc")}
                  </p>
                </div>
                <a
                  href="https://github.com/egorgrebennykov-del/KazBook/actions/workflows/update-exchange-rate.yml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--ghost privileged__btn-sm"
                >
                  {t("privileged.gitActions.runCheck")}
                </a>
              </div>
            </div>

            <div className="privileged__git-repo-card">
              <i className="ri-git-repository-line" />
              <div>
                <strong>{t("privileged.gitActions.repoLabel")}</strong>
                <a
                  href="https://github.com/egorgrebennykov-del/KazBook"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="privileged__link"
                >
                  https://github.com/egorgrebennykov-del/KazBook ↗
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
