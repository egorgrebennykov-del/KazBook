import Discount from "./components/discount/Discount";
import Featured from "./components/featured/Featured";
import NewBooks from "./components/newbooks/NewBooks";
import Testimonial from "./components/testimonial/Testimonial";
import Footer from "./components/footer/Footer";
import Header from "./components/header/Header";
import Home from "./components/home/Home";
import Join from "./components/join/Join";
import Login from "./components/login/Login";
import Search from "./components/search/Search";
import SearchResults from "./components/searchresults/SearchResults";
import BookDetails from "./components/bookdetails/BookDetails";
import Profile from "./components/profile/Profile";
import Cart from "./components/cart/Cart";
import SignUp from "./components/signup/SignUp";
import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router";
import { isLoggedIn } from "../utils/auth";

function GuestOnly({ children }) {
  return isLoggedIn() ? <Navigate to="/" replace /> : children;
}

function App() {
  const [lightTheme, setLightTheme] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const shouldRestoreScroll = Boolean(
    location.state?.restoreCartScroll ||
    location.state?.restoreDiscountScroll ||
    location.state?.restoreHomeScroll,
  );

  useEffect(() => {
    fetch("/api/warmup", { method: "POST" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (shouldRestoreScroll) return;
    window.scrollTo(0, 0);
  }, [location.pathname, location.search, shouldRestoreScroll]);

  useEffect(() => {
    document.body.classList.toggle("dark-theme", !lightTheme);
  }, [lightTheme]);

  const theme = () => {
    setLightTheme((currentTheme) => !currentTheme);
  };

  const login = () => navigate(`/login${location.search}`);
  const signUp = () => navigate(`/sign-up${location.search}`);
  const closeAuth = () => navigate("/");

  return (
    <>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link
        rel="shortcut icon"
        href="assets/img/favicon.png"
        type="image/x-icon"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/remixicon/3.5.0/remixicon.css"
      />
      <link rel="stylesheet" href="assets/css/swiper-bundle.min.css" />
      <link rel="stylesheet" href="/assets/css/styles.css" />
      <title>Litera</title>
      <Header
        theme={theme}
        isLight={lightTheme}
        onSearch={() => setShowSearch(true)}
      />
      <Search show={showSearch} onClose={() => setShowSearch(false)} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <Login onSignUp={signUp} onClose={closeAuth} />
            </GuestOnly>
          }
        />
        <Route
          path="/sign-up"
          element={
            <GuestOnly>
              <SignUp onLogin={login} onClose={closeAuth} />
            </GuestOnly>
          }
        />
        <Route path="/join" element={<Join />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/cart"
          element={<Cart onSearch={() => setShowSearch(true)} />}
        />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/book" element={<BookDetails />} />
        <Route path="/featured" element={<Featured />} />
        <Route path="/discount" element={<Discount />} />
        <Route path="/new" element={<NewBooks />} />
        <Route path="/testimonial" element={<Testimonial />} />
      </Routes>

      <main className="main"></main>
      <Footer />
      <a href="#" className="scrollup" id="scroll-up">
        <i className="ri-arrow-up-line" />
      </a>
    </>
  );
}

export default App;
