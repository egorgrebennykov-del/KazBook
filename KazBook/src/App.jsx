import Footer from "./components/Footer";
import Header from "./components/Header";
import Home from "./components/Home";
import { useEffect, useState } from "react";

function App() {
  const [showHome, setShowHome] = useState(true);
  const [lightTheme, setLightTheme] = useState(true);

  useEffect(() => {
    document.body.classList.toggle("dark-theme", !lightTheme);
  }, [lightTheme]);

  const theme = () => {
    setLightTheme((currentTheme) => !currentTheme);
  };

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
      <title>RuBook</title>
      <Header theme={theme} isLight={lightTheme} />
      {showHome && <Home />}
      <main className="main"></main>
      <Footer />
      <a href="#" className="scrollup" id="scroll-up">
        <i className="ri-arrow-up-line" />
      </a>
    </>
  );
}

export default App;
