import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.jsx";
import SearchCacheProvider from "./context/SearchCacheProvider";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <SearchCacheProvider>
      <App />
    </SearchCacheProvider>
  </BrowserRouter>,
);
