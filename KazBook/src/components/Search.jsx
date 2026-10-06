export default function Search() {
  return (
    <div className="search" id="search-content">
      <form action="" className="search__form">
        <i className="ri-search-line search__icon" />
        <input
          type="search"
          placeholder="What are you looking for?"
          className="search__input"
        />
      </form>
      <i className="ri-close-line search__close" id="search-close" />
    </div>
  );
}
