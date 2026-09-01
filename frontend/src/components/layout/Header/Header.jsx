// frontend/src/components/layout/Header/Header.jsx

import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getTitleForPath } from "../../../data/routes.js";
import { useTheme } from "../../../hooks/useTheme.js";
import "@fortawesome/fontawesome-free/css/all.min.css";
import styles from "./Header.module.css";

export function Header({ onMenuClick }) {
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const [themeOpen, setThemeOpen] = useState(false);
  const themeRef = useRef(null);

  const pageTitle = getTitleForPath(location.pathname);

  useEffect(() => {
    function handleClickOutside(event) {
      if (themeRef.current && !themeRef.current.contains(event.target)) {
        setThemeOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function selectTheme(value) {
    setTheme(value);
    setThemeOpen(false);
  }

  function getThemeIcon() {
    if (theme === "light") {
      return "fa-solid fa-sun";
    }

    if (theme === "dark") {
      return "fa-solid fa-moon";
    }

    return "fa-solid fa-desktop";
  }

  function getThemeLabel() {
    if (theme === "light") {
      return "Light";
    }

    if (theme === "dark") {
      return "Dark";
    }

    return "System";
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuTrigger}
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <i className="fa-solid fa-bars" aria-hidden="true" />
        </button>

        <h1 className={styles.title}>{pageTitle}</h1>
      </div>

      <div className={styles.right}>
        {/* =========================
            THEME
            ========================= */}

        <div ref={themeRef} className={styles.themeWrapper}>
          <button
            type="button"
            className={styles.themeButton}
            onClick={() => setThemeOpen((open) => !open)}
            aria-label="Change theme"
            aria-haspopup="menu"
            aria-expanded={themeOpen}
            title={`Theme: ${getThemeLabel()}`}
          >
            <i className={getThemeIcon()} aria-hidden="true" />
          </button>

          {themeOpen && (
            <div
              className={styles.themeMenu}
              role="menu"
              aria-label="Theme options"
            >
              <button
                type="button"
                className={`${styles.themeOption} ${
                  theme === "light" ? styles.themeOptionActive : ""
                }`}
                onClick={() => selectTheme("light")}
                role="menuitem"
              >
                <i className="fa-solid fa-sun" aria-hidden="true" />

                <span>Light</span>

                {theme === "light" && (
                  <i className="fa-solid fa-check" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                className={`${styles.themeOption} ${
                  theme === "dark" ? styles.themeOptionActive : ""
                }`}
                onClick={() => selectTheme("dark")}
                role="menuitem"
              >
                <i className="fa-solid fa-moon" aria-hidden="true" />

                <span>Dark</span>

                {theme === "dark" && (
                  <i className="fa-solid fa-check" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                className={`${styles.themeOption} ${
                  theme === "system" ? styles.themeOptionActive : ""
                }`}
                onClick={() => selectTheme("system")}
                role="menuitem"
              >
                <i className="fa-solid fa-desktop" aria-hidden="true" />

                <span>System</span>

                {theme === "system" && (
                  <i className="fa-solid fa-check" aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
