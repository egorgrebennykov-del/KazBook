import { useEffect, useRef, useState } from "react";
import { getCookieUser, isLoggedIn } from "../../../utils/auth";
import {
  getOrCreateInquiry,
  sendInquiryMessage,
  markInquiryReadByUser,
  fetchInquiryById,
} from "../../../utils/inquiries";
import { useLanguage } from "../../context/languageContext";
import "./MessengerModal.css";

const GUEST_EMAIL_KEY = "litera_guest_inquiry_email";
const GUEST_NAME_KEY = "litera_guest_inquiry_name";

function formatMsgTime(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function MessengerModal({ isOpen, onClose, onUnreadChange }) {
  const { language } = useLanguage();
  const loggedIn = isLoggedIn();
  const user = loggedIn ? getCookieUser() : null;

  const [guestEmail, setGuestEmail] = useState(() => {
    return localStorage.getItem(GUEST_EMAIL_KEY) || "";
  });
  const [guestName, setGuestName] = useState(() => {
    return localStorage.getItem(GUEST_NAME_KEY) || "";
  });
  const [emailInput, setEmailInput] = useState(guestEmail);
  const [nameInput, setNameInput] = useState(guestName);
  const [emailError, setEmailError] = useState("");

  const [inquiry, setInquiry] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isEditingGuest, setIsEditingGuest] = useState(false);

  const messagesEndRef = useRef(null);
  const pollTimerRef = useRef(null);

  const isIdentified = loggedIn || (Boolean(guestEmail) && !isEditingGuest);

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Load inquiry when modal opens or user/guest changes
  const loadInquiry = async (showSpinner = true) => {
    if (!isOpen) return;
    if (!loggedIn && !guestEmail) return;

    if (showSpinner) setLoading(true);
    try {
      const inq = await getOrCreateInquiry({
        user: loggedIn ? user : null,
        guestEmail: loggedIn ? null : guestEmail,
        guestName: loggedIn ? null : (guestName || "Гость"),
      });

      if (inq) {
        setInquiry(inq);
        const chatList = Array.isArray(inq.chat) ? inq.chat : [];
        setMessages(chatList);

        if (inq.notifications_user > 0) {
          await markInquiryReadByUser(inq.id);
          if (onUnreadChange) onUnreadChange(0);
        }
      }
    } catch (err) {
      console.warn("Error loading inquiry:", err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  // Initial load when opened
  useEffect(() => {
    if (isOpen && isIdentified) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadInquiry(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isIdentified]);

  // Polling for incoming messages while modal is open
  useEffect(() => {
    if (!isOpen || !inquiry?.id) return;

    const interval = setInterval(async () => {
      try {
        const fresh = await fetchInquiryById(inquiry.id);
        if (fresh && fresh.chat) {
          const freshList = Array.isArray(fresh.chat) ? fresh.chat : [];
          setMessages((prev) => {
            if (freshList.length !== prev.length) {
              return freshList;
            }
            return prev;
          });
          setInquiry(fresh);
          if (fresh.notifications_user > 0) {
            await markInquiryReadByUser(fresh.id);
            if (onUnreadChange) onUnreadChange(0);
          }
        }
      } catch (err) {
        console.warn("Poll inquiry failed:", err);
      }
    }, 3500);

    pollTimerRef.current = interval;
    return () => clearInterval(interval);
  }, [isOpen, inquiry?.id]);

  // Auto-scroll when messages update
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setEmailError(
        language === "ru"
          ? "Пожалуйста, введите корректный адрес электронной почты"
          : "Please enter a valid email address"
      );
      return;
    }
    setEmailError("");
    const cleanName = nameInput.trim() || (language === "ru" ? "Гость" : "Guest");
    localStorage.setItem(GUEST_EMAIL_KEY, cleanEmail);
    localStorage.setItem(GUEST_NAME_KEY, cleanName);
    setGuestEmail(cleanEmail);
    setGuestName(cleanName);
    setIsEditingGuest(false);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    if (!inquiry?.id) {
      // Try to load / create first
      await loadInquiry(false);
    }

    const currentInquiryId = inquiry?.id;
    if (!currentInquiryId) return;

    setSending(true);
    const optimisticMsg = {
      id: `opt_${Date.now()}`,
      sender: "user",
      senderName: loggedIn
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
        : guestName || "Гость",
      text,
      timestamp: new Date().toISOString(),
      deliveredViaEmail: false,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");

    try {
      const updatedInq = await sendInquiryMessage({
        inquiryId: currentInquiryId,
        text,
        sender: "user",
        senderUser: loggedIn ? user : null,
      });

      if (updatedInq?.chat) {
        setMessages(updatedInq.chat);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      // fallback: reload
      loadInquiry(false);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const adminName = inquiry?.interlocutors_info?.adminName || "Администратор";

  return (
    <div className="litera-messenger-overlay" onClick={onClose}>
      <div
        className="litera-messenger-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="litera-messenger-header">
          <div className="litera-messenger-admin-info">
            <div className="litera-messenger-avatar">
              <i className="ri-customer-service-2-line" />
              <span className="litera-messenger-online-dot" />
            </div>
            <div>
              <h3 className="litera-messenger-title">
                {language === "ru"
                  ? "Служба поддержки Litera"
                  : "Litera Customer Support"}
              </h3>
              <p className="litera-messenger-subtitle">
                {adminName} • {language === "ru" ? "в сети" : "online"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="litera-messenger-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="ri-close-line" />
          </button>
        </div>

        {/* Guest Identification Form */}
        {!isIdentified ? (
          <div className="litera-messenger-guest-form">
            <div className="litera-messenger-guest-intro">
              <div className="litera-messenger-guest-icon">
                <i className="ri-mail-send-line" />
              </div>
              <h4>
                {language === "ru"
                  ? "Свяжитесь с администратором"
                  : "Contact an Administrator"}
              </h4>
              <p>
                {language === "ru"
                  ? "Укажите ваш email, чтобы администратор мог ответить вам прямо на сайте или письмом на почту."
                  : "Please provide your email so the administrator can answer you directly on the website or via email."}
              </p>
            </div>

            <form onSubmit={handleGuestSubmit}>
              <div className="litera-messenger-field">
                <label>
                  {language === "ru" ? "Ваш Email" : "Your Email"} *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="litera-messenger-field">
                <label>
                  {language === "ru"
                    ? "Ваше имя (необязательно)"
                    : "Your Name (optional)"}
                </label>
                <input
                  type="text"
                  placeholder={language === "ru" ? "Иван" : "John"}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                />
              </div>

              {emailError && (
                <div className="litera-messenger-error">{emailError}</div>
              )}

              <button
                type="submit"
                className="litera-messenger-submit-btn"
              >
                <i className="ri-chat-1-line" />
                {language === "ru" ? "Начать чат" : "Start Chat"}
              </button>
            </form>
          </div>
        ) : (
          /* Chat Area */
          <div className="litera-messenger-body">
            {/* Guest Banner if guest */}
            {!loggedIn && guestEmail && (
              <div className="litera-messenger-guest-banner">
                <span>
                  <i className="ri-mail-line" /> {guestEmail}
                </span>
                <button
                  type="button"
                  className="litera-messenger-change-email-btn"
                  onClick={() => setIsEditingGuest(true)}
                  title={language === "ru" ? "Изменить email" : "Change email"}
                >
                  {language === "ru" ? "Изменить" : "Change"}
                </button>
              </div>
            )}

            {/* Messages List */}
            <div className="litera-messenger-messages">
              {loading && messages.length === 0 ? (
                <div className="litera-messenger-loading">
                  <i className="ri-loader-4-line ri-spin" />
                  <span>
                    {language === "ru"
                      ? "Загрузка сообщений..."
                      : "Loading messages..."}
                  </span>
                </div>
              ) : messages.length === 0 ? (
                <div className="litera-messenger-empty">
                  <div className="litera-messenger-empty-icon">
                    <i className="ri-chat-smile-2-line" />
                  </div>
                  <p>
                    {language === "ru"
                      ? "Здравствуйте! Задайте любой вопрос по книгам, доставке или заказам — администратор скоро ответит вам."
                      : "Hello! Ask any question about books, delivery or orders — an administrator will answer shortly."}
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isUser = msg.sender === "user";
                  return (
                    <div
                      key={msg.id || idx}
                      className={`litera-msg-row ${isUser ? "litera-msg-row--user" : "litera-msg-row--admin"}`}
                    >
                      <div className="litera-msg-bubble">
                        {!isUser && (
                          <div className="litera-msg-sender">
                            {msg.senderName || adminName}
                          </div>
                        )}
                        <div className="litera-msg-text">{msg.text}</div>
                        <div className="litera-msg-meta">
                          <span className="litera-msg-time">
                            {formatMsgTime(msg.timestamp)}
                          </span>
                          {!isUser && msg.deliveredViaEmail && (
                            <span
                              className="litera-msg-email-badge"
                              title={
                                language === "ru"
                                  ? "Отправлено также на вашу электронную почту"
                                  : "Also delivered to your email"
                              }
                            >
                              <i className="ri-mail-check-line" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <form className="litera-messenger-footer" onSubmit={handleSend}>
              <textarea
                rows={1}
                className="litera-messenger-input"
                placeholder={
                  language === "ru"
                    ? "Напишите сообщение..."
                    : "Type a message..."
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
              <button
                type="submit"
                className="litera-messenger-send-btn"
                disabled={!inputText.trim() || sending}
                title={language === "ru" ? "Отправить (Enter)" : "Send (Enter)"}
                aria-label="Send message"
              >
                {sending ? (
                  <i className="ri-loader-4-line ri-spin" />
                ) : (
                  <i className="ri-send-plane-2-fill" />
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
