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
  const { language } = useLanguage();
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
          ? `Привилегии сняты с ${targetUser.email}`
          : `Пользователь ${targetUser.email} теперь имеет роль privileged!`,
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
      showNotice(`Статус заказа обновлен на "${newStatus}"`);
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
      showNotice(`Купон ${newCoupon.code} успешно создан!`);
    } catch (err) {
      showNotice(err.message, true);
    } finally {
      setCouponSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (id, code) => {
    if (!window.confirm(`Удалить купон ${code}?`)) return;
    try {
      await deleteCoupon(id);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      showNotice(`Купон ${code} удален`);
    } catch (err) {
      showNotice(err.message, true);
    }
  };

  if (checkingAuth) {
    return (
      <section className="privileged section container">
        <div className="privileged__spinner-wrap">
          <div className="privileged__spinner" />
          <p>Проверка прав доступа...</p>
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
              Privileged Access
            </span>
          </div>
          <h1 className="privileged__title">Панель управления</h1>
          <p className="privileged__subtitle">
            Управление пользователями, купонами, заказами и автоматизациями
          </p>
        </div>

        <button
          type="button"
          className="button button--ghost privileged__refresh-btn"
          onClick={handleRefresh}
          disabled={loadingData}
          title="Обновить данные"
        >
          <i
            className={`ri-refresh-line ${loadingData ? "privileged__spin" : ""}`}
          />
          Обновить
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
          <span>Пользователи</span>
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
          <span>Привилегированные пользователи</span>
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
          <span>Купоны</span>
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
          <span>Заказы</span>
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
          <span>Git Actions</span>
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
                  placeholder="Поиск по имени, email или телефону..."
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
                Найдено пользователей: <strong>{filteredUsers.length}</strong>
              </span>
            </div>

            <div className="privileged__table-wrap">
              <table className="privileged__table">
                <thead>
                  <tr>
                    <th>Пользователь</th>
                    <th>Email</th>
                    <th>Телефон</th>
                    <th>Дата регистрации</th>
                    <th>Роль</th>
                    <th>Действие</th>
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
                                ? "Снять статус privileged"
                                : "Назначить privileged"
                            }
                          >
                            {isPriv ? (
                              <>
                                <i className="ri-user-unfollow-line" />
                                Снять привилегии
                              </>
                            ) : (
                              <>
                                <i className="ri-vip-crown-line" />
                                Сделать privileged
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
                        Пользователи не найдены
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
                Привилегированные пользователи ({privilegedUsers.length})
              </h2>
              <span className="privileged__stats-text">
                Пользователи с расширенными правами доступа
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
                        <span>Email:</span>
                        <a href={`mailto:${u.email}`} className="privileged__link">
                          {u.email}
                        </a>
                      </div>
                      <div className="privileged__card-row">
                        <span>Телефоны:</span>
                        <span>{phones.join(", ") || "—"}</span>
                      </div>
                      <div className="privileged__card-row">
                        <span>Зарегистрирован:</span>
                        <span>{formatDate(u.created_at, language)}</span>
                      </div>
                      <div className="privileged__card-row">
                        <span>ID:</span>
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
                        Отозвать привилегии
                      </button>
                    </div>
                  </div>
                );
              })}
              {privilegedUsers.length === 0 && (
                <div className="privileged__empty-box">
                  <p>Нет пользователей с ролью privileged</p>
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
                  Управление скидочными купонами
                </h2>
                <span className="privileged__stats-text">
                  Всего купонов: {coupons.length}
                </span>
              </div>
              <button
                type="button"
                className="button privileged__create-btn"
                onClick={() => setShowCouponModal(true)}
              >
                <i className="ri-add-line" />
                Создать купон
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
                    : "Скидка";
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
                        {coupon.name || "Промокод"}
                      </strong>
                      <div className="privileged__coupon-meta">
                        <span>
                          Действует до:{" "}
                          <strong>
                            {coupon.ends_at
                              ? formatDate(coupon.ends_at, language)
                              : "Бессрочно"}
                          </strong>
                        </span>
                        {isExpired && (
                          <span className="privileged__expired-badge">
                            Истёк
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="privileged__coupon-delete-btn"
                        onClick={() =>
                          handleDeleteCoupon(coupon.id, coupon.code)
                        }
                        title="Удалить купон"
                      >
                        <i className="ri-delete-bin-line" />
                        Удалить
                      </button>
                    </div>
                  </div>
                );
              })}
              {coupons.length === 0 && (
                <div className="privileged__empty-box">
                  <i className="ri-ticket-2-line privileged__empty-icon" />
                  <p>Купоны пока не созданы</p>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => setShowCouponModal(true)}
                  >
                    <i className="ri-add-line" />
                    Создать первый купон
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
                      Новый купон
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
                      <label htmlFor="couponCode">Код купона (промокод) *</label>
                      <input
                        id="couponCode"
                        type="text"
                        placeholder="Например: AUTUMN15, BOOK2026"
                        required
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="privileged__form-field">
                      <label htmlFor="couponName">Описание / Название</label>
                      <input
                        id="couponName"
                        type="text"
                        placeholder="Осенняя скидка для постоянных читателей"
                        value={couponName}
                        onChange={(e) => setCouponName(e.target.value)}
                      />
                    </div>
                    <div className="privileged__form-row">
                      <div className="privileged__form-field">
                        <label htmlFor="couponDiscount">Скидка (%)</label>
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
                        <label htmlFor="couponDays">Срок действия (дней)</label>
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
                        Отмена
                      </button>
                      <button
                        type="submit"
                        className="button"
                        disabled={couponSubmitting}
                      >
                        {couponSubmitting ? "Создание..." : "Создать купон"}
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
                  Управление заказами клиентов
                </h2>
                <span className="privileged__stats-text">
                  Всего заказов: {orders.length}
                </span>
              </div>

              <div className="privileged__order-filters">
                <button
                  type="button"
                  className={`privileged__filter-pill ${orderStatusFilter === "all" ? "privileged__filter-pill--active" : ""}`}
                  onClick={() => setOrderStatusFilter("all")}
                >
                  Все ({orders.length})
                </button>
                <button
                  type="button"
                  className={`privileged__filter-pill ${orderStatusFilter === "in_progress" ? "privileged__filter-pill--active" : ""}`}
                  onClick={() => setOrderStatusFilter("in_progress")}
                >
                  В обработке (
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
                  Выполненные (
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
                          Заказ <strong>#{orderNum}</strong>
                        </span>
                        <span className="privileged__order-date">
                          {formatDate(order.created_at || content.createdAt, language)}
                        </span>
                        <span className="privileged__order-user-id">
                          User ID: {order.user_id}
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
                          {isCompleted ? "Выполнен" : "В обработке"}
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
                          title="Переключить статус заказа"
                        >
                          <i className="ri-swap-line" />
                          {isCompleted
                            ? "Вернуть в обработку"
                            : "Отметить выполненным"}
                        </button>
                      </div>
                    </div>

                    {/* Address & Contact info */}
                    <div className="privileged__order-details-grid">
                      <div className="privileged__order-section">
                        <span className="privileged__detail-label">
                          <i className="ri-map-pin-line" /> Адрес доставки:
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
                          <i className="ri-money-euro-circle-line" /> Сумма:
                        </span>
                        <strong className="privileged__order-final-price">
                          {formatPrice(
                            content.finalTotal || content.itemsSubtotal || 0,
                            "EUR",
                            language,
                          )}
                        </strong>
                        <small className="privileged__detail-shipping">
                          (Книги: {formatPrice(content.itemsSubtotal || 0, "EUR", language)}, Доставка: {formatPrice(content.shippingCost || 0, "EUR", language)})
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
                                {item.quantity} шт. × {formatPrice(item.price, "EUR", language)}
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
                  <p>В этой категории пока нет заказов</p>
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
                  GitHub Actions & Автоматизации
                </h2>
                <span className="privileged__stats-text">
                  Автоматические воркфлоу скрапинга и обновления каталога книг
                </span>
              </div>

              <a
                href="https://github.com/egorgrebennykov-del/KazBook/actions"
                target="_blank"
                rel="noopener noreferrer"
                className="button privileged__github-btn"
              >
                <i className="ri-github-fill" />
                Открыть GitHub Actions ↗
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
                    Сбор и обновление кураторской подборки книг из магазинов Молдовы с обогащением обложек и цен.
                  </p>
                </div>
                <a
                  href="https://github.com/egorgrebennykov-del/KazBook/actions/workflows/update-book-picks.yml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--ghost privileged__btn-sm"
                >
                  Запустить / Проверить ↗
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
                    Актуализация книг для витрины главной страницы сайта с синхронизацией в Supabase.
                  </p>
                </div>
                <a
                  href="https://github.com/egorgrebennykov-del/KazBook/actions/workflows/update-home-books.yml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--ghost privileged__btn-sm"
                >
                  Запустить / Проверить ↗
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
                    Сканирование книжных новинок ведущих молдавских книжных сетей и обновление каталога новинок.
                  </p>
                </div>
                <a
                  href="https://github.com/egorgrebennykov-del/KazBook/actions/workflows/update-new-books.yml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--ghost privileged__btn-sm"
                >
                  Запустить / Проверить ↗
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
                    Синхронизация официальных курсов валют (MDL/EUR) для корректного пересчёта цен с доставкой в Европу.
                  </p>
                </div>
                <a
                  href="https://github.com/egorgrebennykov-del/KazBook/actions/workflows/update-exchange-rate.yml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--ghost privileged__btn-sm"
                >
                  Запустить / Проверить ↗
                </a>
              </div>
            </div>

            <div className="privileged__git-repo-card">
              <i className="ri-git-repository-line" />
              <div>
                <strong>Репозиторий проекта на GitHub:</strong>
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
