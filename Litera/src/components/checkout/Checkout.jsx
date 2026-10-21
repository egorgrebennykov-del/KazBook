import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { clearCart, getCart } from "../../../utils/cart";
import {
  deleteUserAddress,
  getCookieUser,
  getProfile,
  getUserAddresses,
  isLoggedIn,
  saveUserAddress,
} from "../../../utils/auth";
import { createOrderInProgress } from "../../../utils/orders";
import BookImage from "../common/BookImage";
import decodeHtmlEntities from "../../../utils/decodeHtmlEntities";
import { useLanguage } from "../../context/languageContext";
import "./Checkout.css";

const COUNTRIES = [
  { code: "MD", dialCode: "+373", flag: "🇲🇩", name: { ru: "Молдова", en: "Moldova" } },
  { code: "RO", dialCode: "+40", flag: "🇷🇴", name: { ru: "Румыния", en: "Romania" } },
  { code: "BG", dialCode: "+359", flag: "🇧🇬", name: { ru: "Болгария", en: "Bulgaria" } },
  { code: "UA", dialCode: "+380", flag: "🇺🇦", name: { ru: "Украина", en: "Ukraine" } },
  { code: "DE", dialCode: "+49", flag: "🇩🇪", name: { ru: "Германия", en: "Germany" } },
  { code: "FR", dialCode: "+33", flag: "🇫🇷", name: { ru: "Франция", en: "France" } },
  { code: "IT", dialCode: "+39", flag: "🇮🇹", name: { ru: "Италия", en: "Italy" } },
  { code: "ES", dialCode: "+34", flag: "🇪🇸", name: { ru: "Испания", en: "Spain" } },
  { code: "PL", dialCode: "+48", flag: "🇵🇱", name: { ru: "Польша", en: "Poland" } },
  { code: "GB", dialCode: "+44", flag: "🇬🇧", name: { ru: "Великобритания", en: "United Kingdom" } },
  { code: "GR", dialCode: "+30", flag: "🇬🇷", name: { ru: "Греция", en: "Greece" } },
  { code: "CZ", dialCode: "+420", flag: "🇨🇿", name: { ru: "Чехия", en: "Czech Republic" } },
  { code: "AT", dialCode: "+43", flag: "🇦🇹", name: { ru: "Австрия", en: "Austria" } },
  { code: "PT", dialCode: "+351", flag: "🇵🇹", name: { ru: "Португалия", en: "Portugal" } },
  { code: "NL", dialCode: "+31", flag: "🇳🇱", name: { ru: "Нидерланды", en: "Netherlands" } },
  { code: "BE", dialCode: "+32", flag: "🇧🇪", name: { ru: "Бельгия", en: "Belgium" } },
  { code: "CH", dialCode: "+41", flag: "🇨🇭", name: { ru: "Швейцария", en: "Switzerland" } },
  { code: "SE", dialCode: "+46", flag: "🇸🇪", name: { ru: "Швеция", en: "Sweden" } },
  { code: "NO", dialCode: "+47", flag: "🇳🇴", name: { ru: "Норвегия", en: "Norway" } },
  { code: "DK", dialCode: "+45", flag: "🇩🇰", name: { ru: "Дания", en: "Denmark" } },
  { code: "FI", dialCode: "+358", flag: "🇫🇮", name: { ru: "Финляндия", en: "Finland" } },
  { code: "IE", dialCode: "+353", flag: "🇮🇪", name: { ru: "Ирландия", en: "Ireland" } },
  { code: "SK", dialCode: "+421", flag: "🇸🇰", name: { ru: "Словакия", en: "Slovakia" } },
  { code: "HU", dialCode: "+36", flag: "🇭🇺", name: { ru: "Венгрия", en: "Hungary" } },
  { code: "RS", dialCode: "+381", flag: "🇷🇸", name: { ru: "Сербия", en: "Serbia" } },
  { code: "HR", dialCode: "+385", flag: "🇭🇷", name: { ru: "Хорватия", en: "Croatia" } },
  { code: "SI", dialCode: "+386", flag: "🇸🇮", name: { ru: "Словения", en: "Slovenia" } },
  { code: "LT", dialCode: "+370", flag: "🇱🇹", name: { ru: "Литва", en: "Lithuania" } },
  { code: "LV", dialCode: "+371", flag: "🇱🇻", name: { ru: "Латвия", en: "Latvia" } },
  { code: "EE", dialCode: "+372", flag: "🇪🇪", name: { ru: "Эстония", en: "Estonia" } },
  { code: "CY", dialCode: "+357", flag: "🇨🇾", name: { ru: "Кипр", en: "Cyprus" } },
  { code: "IL", dialCode: "+972", flag: "🇮🇱", name: { ru: "Израиль", en: "Israel" } },
  { code: "TR", dialCode: "+90", flag: "🇹🇷", name: { ru: "Турция", en: "Turkey" } },
  { code: "GE", dialCode: "+995", flag: "🇬🇪", name: { ru: "Грузия", en: "Georgia" } },
  { code: "AM", dialCode: "+374", flag: "🇦🇲", name: { ru: "Армения", en: "Armenia" } },
  { code: "KZ", dialCode: "+7", flag: "🇰🇿", name: { ru: "Казахстан", en: "Kazakhstan" } },
  { code: "US", dialCode: "+1", flag: "🇺🇸", name: { ru: "США", en: "USA" } },
  { code: "CA", dialCode: "+1", flag: "🇨🇦", name: { ru: "Канада", en: "Canada" } },
];

// Base shipping calculation - can be customized by the user with any formula
function calculateShipping(address) {
  if (!address) return 0;
  const hasCityOrStreet = Boolean(
    (address.city && address.city.trim().length > 0) ||
      (address.street && address.street.trim().length > 0),
  );
  if (!hasCityOrStreet) return 0;
  // Default delivery fee in EUR (user will customize this later)
  return 5.0;
}

function generateOrderNumber() {
  return `LB-${Math.floor(100000 + Math.random() * 900000)}`;
}

function formatPrice(price, currency, language) {
  const locale = language === "ru" ? "ru-RU" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: currency === "EUR" ? 2 : 0,
  }).format(price);
}

export default function Checkout() {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const user = getCookieUser();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(loggedIn);
  const [error, setError] = useState("");

  // Step 1: books list review; Step 2: address & payment
  const [step, setStep] = useState(1);

  // Address state
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(loggedIn);
  const [selectedAddressId, setSelectedAddressId] = useState("new");
  const [saveAddressOption, setSaveAddressOption] = useState(true);
  const [addressForm, setAddressForm] = useState({
    recipientName: "",
    country: "",
    city: "",
    street: "",
    postalCode: "",
    phone: "",
  });
  const [addressError, setAddressError] = useState("");

  // Country selector state for phone input
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryDropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isCountryOpen) return;
    const handleOutsideClick = (e) => {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(e.target)
      ) {
        setIsCountryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isCountryOpen]);

  // Filter countries in dropdown
  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => {
      const ruName = c.name.ru.toLowerCase();
      const enName = c.name.en.toLowerCase();
      const dial = c.dialCode.toLowerCase();
      return (
        ruName.includes(q) ||
        enName.includes(q) ||
        dial.includes(q) ||
        c.code.toLowerCase().includes(q)
      );
    });
  }, [countrySearch]);

  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    setIsCountryOpen(false);
    setCountrySearch("");

    setAddressForm((prev) => {
      const currentPhone = prev.phone.trim();
      if (!currentPhone) {
        return {
          ...prev,
          phone: `${country.dialCode} `,
        };
      }
      const matched = COUNTRIES.find((c) => currentPhone.startsWith(c.dialCode));
      let subscriber = matched
        ? currentPhone.slice(matched.dialCode.length).trim()
        : currentPhone.replace(/^\+\d+\s*/, "").trim();
      subscriber = subscriber.replace(/^0+/, "");
      return {
        ...prev,
        phone: subscriber ? `${country.dialCode} ${subscriber}` : `${country.dialCode} `,
      };
    });
  };

  const handlePhoneChange = (e) => {
    const rawVal = e.target.value;
    if (!rawVal) {
      setAddressForm((prev) => ({ ...prev, phone: "" }));
      return;
    }

    const dial = selectedCountry.dialCode;
    const dialDigits = dial.replace("+", "");
    const codeRegex = new RegExp(`^\\+?${dialDigits}\\s*`, "i");

    // Case 1: starts with selected dial code
    if (codeRegex.test(rawVal)) {
      let subscriber = rawVal.replace(codeRegex, "");
      // Auto-strip leading zero(s) e.g. 087 -> 87
      subscriber = subscriber.replace(/^0+/, "");
      const formatted = subscriber ? `${dial} ${subscriber}` : `${dial} `;
      setAddressForm((prev) => ({ ...prev, phone: formatted }));
      return;
    }

    // Case 2: starts with another country '+' code
    if (rawVal.startsWith("+")) {
      const matched = COUNTRIES.find((c) => rawVal.startsWith(c.dialCode));
      if (matched) {
        setSelectedCountry(matched);
        let subscriber = rawVal.slice(matched.dialCode.length).trimStart();
        subscriber = subscriber.replace(/^0+/, "");
        const formatted = subscriber ? `${matched.dialCode} ${subscriber}` : `${matched.dialCode} `;
        setAddressForm((prev) => ({ ...prev, phone: formatted }));
        return;
      }
      const cleaned = rawVal.replace(/^(\+\d{1,4}\s*)0+/, "$1");
      setAddressForm((prev) => ({ ...prev, phone: cleaned }));
      return;
    }

    // Case 3: local number entered (e.g. 087...) -> strip leading zero and prepend dial code
    let subscriber = rawVal.replace(/^0+/, "");
    const formatted = subscriber ? `${dial} ${subscriber}` : `${dial} `;
    setAddressForm((prev) => ({ ...prev, phone: formatted }));
  };

  // Order completion state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(null);

  // Load cart items & user profile
  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;

    Promise.all([getCart(user?.id), getProfile()])
      .then(([cartRows, profile]) => {
        if (cancelled) return;
        setItems(cartRows);
        if (profile?.firstName || profile?.lastName) {
          const defaultName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
          setAddressForm((current) => ({
            ...current,
            recipientName: current.recipientName || defaultName,
          }));
        }
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [loggedIn, user?.id]);

  // Load user saved addresses from Supabase user.adresses JSON column
  useEffect(() => {
    if (!loggedIn || !user?.id) return;
    let cancelled = false;

    getUserAddresses(user.id)
      .then((addresses) => {
        if (cancelled) return;
        setSavedAddresses(addresses);
        if (addresses.length > 0) {
          setSelectedAddressId(addresses[0].id);
        } else {
          setSelectedAddressId("new");
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingAddresses(false));

    return () => {
      cancelled = true;
    };
  }, [loggedIn, user?.id]);

  if (!loggedIn) {
    return (
      <section className="checkout section container">
        <div className="checkout__guest">
          <i className="ri-shopping-bag-3-line checkout__guest-icon" />
          <h1 className="checkout__title">{t("checkout.title")}</h1>
          <p>{t("cart.guestDesc")}</p>
          <div className="checkout__actions">
            <Link className="button" to="/login?redirect=%2Fcheckout">
              {t("auth.loginBtn")}
            </Link>
            <Link className="checkout__signup" to="/sign-up?redirect=%2Fcheckout">
              {t("auth.signUpBtn")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Calculate items subtotal
  const itemsSubtotal = items.reduce((acc, book) => {
    const qty = Math.max(1, Number(book.quantity) || 1);
    const unitPrice = Number(book.price) || 0;
    return acc + unitPrice * qty;
  }, 0);

  // Active address determination
  const selectedSavedAddress =
    selectedAddressId !== "new"
      ? savedAddresses.find((a) => a.id === selectedAddressId)
      : null;

  const currentAddress = selectedSavedAddress || addressForm;

  // Shipping cost calculation based on address
  const shippingCost = calculateShipping(currentAddress);
  const hasValidAddress = Boolean(
    (currentAddress.city && currentAddress.city.trim().length > 0) &&
      (currentAddress.street && currentAddress.street.trim().length > 0),
  );

  const finalTotal = itemsSubtotal + shippingCost;

  // Handle continuing from books list to address step
  const handleContinueToAddress = () => {
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle address deletion
  const handleDeleteAddress = async (id, e) => {
    e.stopPropagation();
    try {
      const updated = await deleteUserAddress(user.id, id);
      setSavedAddresses(updated);
      if (selectedAddressId === id) {
        if (updated.length > 0) {
          setSelectedAddressId(updated[0].id);
        } else {
          setSelectedAddressId("new");
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle payment and order placement
  const handlePay = async () => {
    setAddressError("");
    setError("");

    // Validate address if typing a new one
    if (selectedAddressId === "new") {
      if (!addressForm.city.trim() || !addressForm.street.trim()) {
        setAddressError(t("checkout.fillRequired"));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let finalShippingAddress = currentAddress;

      // Save address if user opted in for new address
      if (selectedAddressId === "new" && saveAddressOption) {
        try {
          const saved = await saveUserAddress(user.id, addressForm);
          finalShippingAddress = saved;
        } catch {
          // Continue even if saving address fails
        }
      }

      // Generate order ID
      const orderNumber = generateOrderNumber();

      // Record order in Supabase orders_in_progress
      await createOrderInProgress({
        userId: user.id,
        orderNumber,
        items,
        address: finalShippingAddress,
        itemsSubtotal,
        shippingCost,
        finalTotal,
      });

      // Clear the cart
      await clearCart(user.id);

      // Record successful order
      setOrderComplete({
        orderNumber,
        items: [...items],
        address: finalShippingAddress,
        itemsSubtotal,
        shippingCost,
        finalTotal,
        date: new Date(),
      });
      setItems([]);
    } catch (err) {
      setError(err.message || "Failed to process payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Order confirmation view
  if (orderComplete) {
    return (
      <section className="checkout section container">
        <div className="checkout__success-card">
          <div className="checkout__success-badge">
            <i className="ri-check-line" />
          </div>
          <h1 className="checkout__success-title">{t("checkout.successTitle")}</h1>
          <p className="checkout__success-desc">{t("checkout.successDesc")}</p>

          <div className="checkout__order-meta">
            <div className="checkout__order-info-item">
              <span className="checkout__meta-label">{t("checkout.orderNumber")}:</span>
              <strong>#{orderComplete.orderNumber}</strong>
            </div>
            <div className="checkout__order-info-item">
              <span className="checkout__meta-label">{t("checkout.deliveryAddress")}:</span>
              <span>
                {orderComplete.address.recipientName && (
                  <strong>{orderComplete.address.recipientName}, </strong>
                )}
                {orderComplete.address.street}, {orderComplete.address.city}
                {orderComplete.address.country ? `, ${orderComplete.address.country}` : ""}
                {orderComplete.address.postalCode ? ` (${orderComplete.address.postalCode})` : ""}
              </span>
            </div>
            <div className="checkout__order-info-item">
              <span className="checkout__meta-label">{t("checkout.finalTotal")}:</span>
              <strong className="checkout__meta-total">
                {formatPrice(orderComplete.finalTotal, "EUR", language)}
              </strong>
            </div>
          </div>

          <div className="checkout__success-items">
            {orderComplete.items.map((item) => (
              <div className="checkout__success-item" key={item.id}>
                <BookImage
                  className="checkout__success-thumb"
                  src={item.image}
                  alt={item.title}
                />
                <div className="checkout__success-item-info">
                  <span className="checkout__success-item-title">
                    {decodeHtmlEntities(item.title)}
                  </span>
                  <small className="checkout__success-item-meta">
                    {item.quantity} × {formatPrice(item.price, "EUR", language)}
                  </small>
                </div>
                <strong className="checkout__success-item-price">
                  {formatPrice(item.price * item.quantity, "EUR", language)}
                </strong>
              </div>
            ))}
          </div>

          <div className="checkout__success-actions">
            <button
              type="button"
              className="button"
              onClick={() => navigate("/")}
            >
              <i className="ri-home-4-line" />
              {t("checkout.toHome")}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => navigate("/featured")}
            >
              <i className="ri-book-open-line" />
              {t("checkout.toCatalog")}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="checkout section container">
      <div className="checkout__heading">
        <div>
          <h1 className="checkout__title">{t("checkout.title")}</h1>
          <div className="checkout__steps-indicator">
            <button
              type="button"
              className={`checkout__step-tab ${step === 1 ? "checkout__step-tab--active" : ""}`}
              onClick={() => setStep(1)}
            >
              1. {t("checkout.booksTitle")}
            </button>
            <span className="checkout__step-divider">›</span>
            <button
              type="button"
              className={`checkout__step-tab ${step === 2 ? "checkout__step-tab--active" : ""}`}
              onClick={() => items.length > 0 && setStep(2)}
              disabled={items.length === 0}
            >
              2. {t("checkout.addressTitle")}
            </button>
          </div>
        </div>
        <Link to="/cart" className="checkout__back-link">
          <i className="ri-arrow-left-line" />
          {t("checkout.backToCart")}
        </Link>
      </div>

      {error && (
        <p className="checkout__error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="checkout__loading" aria-label={t("cart.loading")} />
      ) : items.length === 0 ? (
        <div className="checkout__empty">
          <i className="ri-shopping-basket-line" />
          <h2>{t("checkout.emptyCart")}</h2>
          <Link to="/cart" className="button">
            {t("checkout.backToCart")}
          </Link>
        </div>
      ) : (
        <div className="checkout__content">
          {/* STEP 1: Books List & Subtotal */}
          {step === 1 && (
            <div className="checkout__step-container">
              <h2 className="checkout__section-title">
                <i className="ri-book-2-line" />
                {t("checkout.booksTitle")}
              </h2>

              <div className="checkout__items-list">
                {items.map((book) => {
                  const qty = Math.max(1, Number(book.quantity) || 1);
                  const unitPrice = Number(book.price) || 0;
                  const itemTotal = unitPrice * qty;

                  return (
                    <article className="checkout__item-card" key={book.id}>
                      <BookImage
                        className="checkout__item-img"
                        src={book.image}
                        alt={book.title || ""}
                      />
                      <div className="checkout__item-details">
                        <strong className="checkout__item-title">
                          {decodeHtmlEntities(book.title)}
                        </strong>
                        <span className="checkout__item-shop">{book.shop}</span>
                        <div className="checkout__item-qty-row">
                          <span className="checkout__item-unit-price">
                            {formatPrice(unitPrice, "EUR", language)} × {qty}
                          </span>
                        </div>
                      </div>
                      <div className="checkout__item-total-col">
                        <strong className="checkout__item-total">
                          {formatPrice(itemTotal, "EUR", language)}
                        </strong>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Subtotal & Continue Button */}
              <div className="checkout__subtotal-card">
                <div className="checkout__subtotal-row">
                  <span className="checkout__subtotal-label">
                    {t("checkout.subtotal")}
                  </span>
                  <strong className="checkout__subtotal-value">
                    {formatPrice(itemsSubtotal, "EUR", language)}
                  </strong>
                </div>
                <button
                  type="button"
                  className="button checkout__continue-btn"
                  onClick={handleContinueToAddress}
                >
                  {t("checkout.continue")}
                  <i className="ri-arrow-right-line" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Address Entry/Selection & Shipping & Payment */}
          {step === 2 && (
            <div className="checkout__step-container">
              <div className="checkout__address-step-header">
                <h2 className="checkout__section-title">
                  <i className="ri-map-pin-line" />
                  {t("checkout.addressTitle")}
                </h2>
                <button
                  type="button"
                  className="checkout__back-btn"
                  onClick={() => setStep(1)}
                >
                  <i className="ri-arrow-left-s-line" />
                  {t("checkout.back")}
                </button>
              </div>

              {/* Saved Addresses list if any exist */}
              {loadingAddresses ? (
                <div className="checkout__addresses-loading">
                  <div className="checkout__spinner" />
                </div>
              ) : savedAddresses.length > 0 ? (
                <div className="checkout__saved-section">
                  <h3 className="checkout__subset-title">
                    {t("checkout.savedAddresses")}
                  </h3>
                  <div className="checkout__saved-grid">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <label
                          key={addr.id}
                          className={`checkout__address-card ${isSelected ? "checkout__address-card--selected" : ""}`}
                          onClick={() => setSelectedAddressId(addr.id)}
                        >
                          <div className="checkout__address-radio-wrap">
                            <input
                              type="radio"
                              name="checkoutAddress"
                              checked={isSelected}
                              onChange={() => setSelectedAddressId(addr.id)}
                            />
                          </div>
                          <div className="checkout__address-card-body">
                            {addr.recipientName && (
                              <strong className="checkout__address-name">
                                {addr.recipientName}
                              </strong>
                            )}
                            <p className="checkout__address-line">
                              {addr.street}, {addr.city}
                              {addr.country ? `, ${addr.country}` : ""}
                            </p>
                            {addr.postalCode && (
                              <span className="checkout__address-postal">
                                {addr.postalCode}
                              </span>
                            )}
                            {addr.phone && (
                              <span className="checkout__address-phone">
                                <i className="ri-phone-line" /> {addr.phone}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="checkout__address-delete-btn"
                            title={t("checkout.deleteAddress")}
                            aria-label={t("checkout.deleteAddress")}
                            onClick={(e) => handleDeleteAddress(addr.id, e)}
                          >
                            <i className="ri-delete-bin-line" />
                          </button>
                        </label>
                      );
                    })}

                    {/* Option to enter a new address */}
                    <label
                      className={`checkout__address-card checkout__address-card--new ${selectedAddressId === "new" ? "checkout__address-card--selected" : ""}`}
                      onClick={() => setSelectedAddressId("new")}
                    >
                      <div className="checkout__address-radio-wrap">
                        <input
                          type="radio"
                          name="checkoutAddress"
                          checked={selectedAddressId === "new"}
                          onChange={() => setSelectedAddressId("new")}
                        />
                      </div>
                      <div className="checkout__address-card-body">
                        <strong>+ {t("checkout.newAddress")}</strong>
                      </div>
                    </label>
                  </div>
                </div>
              ) : null}

              {/* Form to enter a new address */}
              {selectedAddressId === "new" && (
                <div className="checkout__form-card">
                  <h3 className="checkout__subset-title">
                    {t("checkout.newAddress")}
                  </h3>

                  <div className="checkout__form-grid">
                    <div className="checkout__form-field checkout__form-field--full">
                      <label htmlFor="recipientName">{t("checkout.recipientName")}</label>
                      <input
                        id="recipientName"
                        type="text"
                        value={addressForm.recipientName}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, recipientName: e.target.value })
                        }
                      />
                    </div>

                    <div className="checkout__form-field">
                      <label htmlFor="country">{t("checkout.country")}</label>
                      <input
                        id="country"
                        type="text"
                        value={addressForm.country}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, country: e.target.value })
                        }
                      />
                    </div>

                    <div className="checkout__form-field">
                      <label htmlFor="city">
                        {t("checkout.city")} <span className="checkout__required">*</span>
                      </label>
                      <input
                        id="city"
                        type="text"
                        required
                        value={addressForm.city}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, city: e.target.value })
                        }
                      />
                    </div>

                    <div className="checkout__form-field checkout__form-field--full">
                      <label htmlFor="street">
                        {t("checkout.street")} <span className="checkout__required">*</span>
                      </label>
                      <input
                        id="street"
                        type="text"
                        required
                        value={addressForm.street}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, street: e.target.value })
                        }
                      />
                    </div>

                    <div className="checkout__form-field">
                      <label htmlFor="postalCode">{t("checkout.postalCode")}</label>
                      <input
                        id="postalCode"
                        type="text"
                        value={addressForm.postalCode}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, postalCode: e.target.value })
                        }
                      />
                    </div>

                    <div className="checkout__form-field">
                      <label htmlFor="phone">{t("checkout.phone")}</label>
                      <div className="checkout__phone-group">
                        <div
                          className="checkout__country-select-wrap"
                          ref={countryDropdownRef}
                        >
                          <button
                            type="button"
                            className="checkout__country-btn"
                            onClick={() => setIsCountryOpen((prev) => !prev)}
                            title={
                              selectedCountry
                                ? `${selectedCountry.name[language] || selectedCountry.name.ru} (${selectedCountry.dialCode})`
                                : t("checkout.selectCountry")
                            }
                            aria-expanded={isCountryOpen}
                          >
                            <span className="checkout__country-flag">
                              {selectedCountry.flag}
                            </span>
                            <span className="checkout__country-code">
                              {selectedCountry.dialCode}
                            </span>
                            <i
                              className={`ri-arrow-down-s-line checkout__country-arrow ${isCountryOpen ? "checkout__country-arrow--open" : ""}`}
                            />
                          </button>

                          {isCountryOpen && (
                            <div className="checkout__country-dropdown">
                              <div className="checkout__country-search-wrap">
                                <i className="ri-search-line" />
                                <input
                                  type="text"
                                  className="checkout__country-search-input"
                                  placeholder={t("checkout.searchCountry")}
                                  value={countrySearch}
                                  onChange={(e) => setCountrySearch(e.target.value)}
                                  autoFocus
                                />
                                {countrySearch && (
                                  <button
                                    type="button"
                                    className="checkout__country-search-clear"
                                    onClick={() => setCountrySearch("")}
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                              <ul className="checkout__country-list">
                                {filteredCountries.map((c) => {
                                  const isCurrent =
                                    c.code === selectedCountry.code &&
                                    c.dialCode === selectedCountry.dialCode;
                                  return (
                                    <li
                                      key={`${c.code}-${c.dialCode}`}
                                      className={`checkout__country-option ${isCurrent ? "checkout__country-option--selected" : ""}`}
                                      onClick={() => handleSelectCountry(c)}
                                    >
                                      <span className="checkout__country-opt-flag">
                                        {c.flag}
                                      </span>
                                      <span className="checkout__country-opt-name">
                                        {c.name[language] || c.name.ru}
                                      </span>
                                      <span className="checkout__country-opt-code">
                                        {c.dialCode}
                                      </span>
                                    </li>
                                  );
                                })}
                                {filteredCountries.length === 0 && (
                                  <li className="checkout__country-no-results">
                                    {t("checkout.noCountryFound")}
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>

                        <input
                          id="phone"
                          type="tel"
                          className="checkout__phone-input"
                          value={addressForm.phone}
                          onChange={handlePhoneChange}
                        />
                      </div>
                    </div>
                  </div>

                  <label className="checkout__checkbox-label">
                    <input
                      type="checkbox"
                      checked={saveAddressOption}
                      onChange={(e) => setSaveAddressOption(e.target.checked)}
                    />
                    <span>{t("checkout.saveAddress")}</span>
                  </label>
                </div>
              )}

              {addressError && (
                <p className="checkout__form-error" role="alert">
                  {addressError}
                </p>
              )}

              {/* Delivery and Final Total Card */}
              <div className="checkout__summary-card">
                <h3 className="checkout__subset-title">
                  <i className="ri-secure-payment-line" />
                  {t("checkout.deliveryTitle")}
                </h3>

                <div className="checkout__summary-rows">
                  <div className="checkout__summary-row">
                    <span>{t("checkout.itemsTotal")}</span>
                    <span>{formatPrice(itemsSubtotal, "EUR", language)}</span>
                  </div>

                  <div className="checkout__summary-row">
                    <span className="checkout__shipping-label">
                      <i className="ri-truck-line" />
                      {t("checkout.shipping")}
                    </span>
                    <span className="checkout__shipping-val">
                      {hasValidAddress
                        ? formatPrice(shippingCost, "EUR", language)
                        : `—`}
                    </span>
                  </div>

                  {!hasValidAddress && (
                    <p className="checkout__shipping-hint">
                      <i className="ri-information-line" />
                      {t("checkout.fillAddressPrompt")}
                    </p>
                  )}

                  <div className="checkout__summary-row checkout__summary-row--total">
                    <span>{t("checkout.finalTotal")}</span>
                    <strong className="checkout__final-price">
                      {formatPrice(
                        hasValidAddress ? finalTotal : itemsSubtotal,
                        "EUR",
                        language,
                      )}
                    </strong>
                  </div>
                </div>

                {/* Pay button directly beneath the final price */}
                <button
                  type="button"
                  className="button checkout__pay-btn"
                  disabled={!hasValidAddress || isSubmitting}
                  onClick={handlePay}
                >
                  <i className="ri-shield-check-line" />
                  {isSubmitting ? t("checkout.paying") : t("checkout.pay")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
