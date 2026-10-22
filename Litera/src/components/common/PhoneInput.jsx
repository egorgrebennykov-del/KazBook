import { useEffect, useMemo, useRef, useState } from "react";
import { countries } from "../checkout/countryPhoneCodes.js";
import { useLanguage } from "../../context/languageContext.js";
import { stripCountryCodeAndLeadingZero } from "../../../utils/phone.js";

export default function PhoneInput({
  id = "phone",
  phone = "",
  countryIso = "MD",
  onPhoneChange,
  onCountryChange,
  required = false,
  autoComplete = "tel-national",
  className = "",
}) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.iso2 === countryIso) || countries[0],
    [countryIso],
  );

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return countries;

    const isSearchingIsrael =
      q.includes("изра") ||
      q.includes("isra") ||
      ("израиль".startsWith(q) && q.length >= 2) ||
      ("israel".startsWith(q) && q.length >= 2);

    return countries.filter((c) => {
      if (isSearchingIsrael) {
        if (c.iso2 === "IL") return false;
        if (c.iso2 === "PS") return true;
      }

      const en = c.name.toLowerCase();
      const ru = (c.ruName || "").toLowerCase();
      const dial = c.dialCode.toLowerCase();
      const iso = c.iso2.toLowerCase();
      return (
        en.includes(q) ||
        ru.includes(q) ||
        dial.includes(q) ||
        iso.includes(q)
      );
    });
  }, [search]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [isOpen]);

  const handleSelectCountry = (country) => {
    onCountryChange?.(country.iso2);
    setIsOpen(false);
    setSearch("");
    const cleaned = stripCountryCodeAndLeadingZero(phone, country.dialCode);
    onPhoneChange?.(cleaned);
  };

  const handleInputChange = (e) => {
    const rawVal = e.target.value;
    if (!rawVal) {
      onPhoneChange?.("");
      return;
    }

    const trimmed = rawVal.trimStart();
    if (trimmed.startsWith("+")) {
      const sorted = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
      const matched = sorted.find((c) => trimmed.startsWith(c.dialCode));
      if (matched) {
        onCountryChange?.(matched.iso2);
        let subscriber = trimmed.slice(matched.dialCode.length).trimStart();
        subscriber = subscriber.replace(/^0+/, "");
        onPhoneChange?.(subscriber);
        return;
      }
    }

    const cleaned = stripCountryCodeAndLeadingZero(rawVal, selectedCountry.dialCode);
    onPhoneChange?.(cleaned);
  };

  const displayName = language === "ru" ? selectedCountry.ruName : selectedCountry.name;

  return (
    <div className={`checkout__phone-group ${className}`}>
      <div className="checkout__country-select-wrap" ref={dropdownRef}>
        <button
          type="button"
          className="checkout__country-btn"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          title={`${displayName} (${selectedCountry.dialCode})`}
        >
          <img
            src={selectedCountry.flagUrl}
            alt={selectedCountry.iso2}
            className="checkout__country-flag-img"
            width="20"
            height="15"
          />
          <span className="checkout__country-code">
            {selectedCountry.dialCode}
          </span>
          <i
            className={`ri-arrow-down-s-line checkout__country-arrow ${isOpen ? "checkout__country-arrow--open" : ""}`}
          />
        </button>

        {isOpen && (
          <div className="checkout__country-dropdown">
            <div className="checkout__country-search-wrap">
              <i className="ri-search-line" />
              <input
                ref={searchInputRef}
                type="text"
                className="checkout__country-search-input"
                placeholder={
                  language === "ru"
                    ? "Поиск страны или кода..."
                    : "Search country or code..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="checkout__country-search-clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear"
                >
                  ×
                </button>
              )}
            </div>
            <ul className="checkout__country-list" role="listbox">
              {filteredCountries.map((c) => {
                const isSelected = c.iso2 === selectedCountry.iso2;
                const cName = language === "ru" ? c.ruName : c.name;
                return (
                  <li
                    key={c.iso2}
                    role="option"
                    aria-selected={isSelected}
                    className={`checkout__country-option ${isSelected ? "checkout__country-option--selected" : ""}`}
                    onClick={() => handleSelectCountry(c)}
                  >
                    <img
                      src={c.flagUrl}
                      alt={c.iso2}
                      className="checkout__country-flag-img"
                      width="20"
                      height="15"
                      loading="lazy"
                    />
                    <span className="checkout__country-opt-name">
                      {cName}
                    </span>
                    <span className="checkout__country-opt-code">
                      {c.dialCode}
                    </span>
                  </li>
                );
              })}
              {filteredCountries.length === 0 && (
                <li className="checkout__country-no-results">
                  {language === "ru"
                    ? "Ничего не найдено"
                    : "No results found"}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <input
        id={id}
        type="tel"
        className="checkout__phone-input"
        value={phone}
        onChange={handleInputChange}
        required={required}
        autoComplete={autoComplete}
      />
    </div>
  );
}
