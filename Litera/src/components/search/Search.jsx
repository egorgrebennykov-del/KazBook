import { useState } from "react";
import { useNavigate } from "react-router";

export default function Search({ show, onClose }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = query.trim();
    if (!text) return;

    navigate(`/search?q=${encodeURIComponent(text)}`);
    onClose();
  };

  return (
    <div className={`search ${show ? "show-search" : ""}`} id="search-content">
      <form className="search__form" onSubmit={handleSubmit}>
        <i className="ri-search-line search__icon" />
        <input
          type="search"
          placeholder="What are you looking for?"
          className="search__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
      <i
        className="ri-close-line search__close"
        id="search-close"
        onClick={onClose}
      />
    </div>
  );
}
