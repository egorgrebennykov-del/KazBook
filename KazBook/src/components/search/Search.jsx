export default function Search({ show, onClose }) {
  return (
    <div className={`search ${show ? "show-search" : ""}`} id="search-content">
      <form action="" className="search__form">
        <i className="ri-search-line search__icon" />
        <input
          type="search"
          placeholder="What are you looking for?"
          className="search__input"
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
