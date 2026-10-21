import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.jsx";
import SearchCacheProvider from "./context/SearchCacheProvider";
import LanguageProvider from "./context/LanguageProvider";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <LanguageProvider>
      <SearchCacheProvider>
        <App />
      </SearchCacheProvider>
    </LanguageProvider>
  </BrowserRouter>,
);
