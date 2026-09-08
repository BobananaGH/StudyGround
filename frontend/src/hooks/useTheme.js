// frontend/src/hooks/useTheme.js
import { useEffect, useMemo, useState } from "react";

const THEME_KEY = "StudyGround-theme";

const THEMES = ["light", "dark", "system"];

function getStoredTheme() {
  try {
    const storedTheme = localStorage.getItem(THEME_KEY);
    return THEMES.includes(storedTheme) ? storedTheme : "system";
  } catch {
    return "system";
  }
}

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function useTheme() {
  const [theme, setThemeState] = useState(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (event) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    handleChange(mediaQuery);

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  // Resolve "system" to the actual current theme.
  // This MUST be declared before the effect that uses it.
  const resolvedTheme = useMemo(() => {
    return theme === "system" ? systemTheme : theme;
  }, [theme, systemTheme]);

  // Apply the resolved theme to <html>.
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  // Save the selected theme.
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Ignore unavailable storage.
    }
  }, [theme]);

  // Sync theme changes between browser tabs.
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === THEME_KEY && THEMES.includes(event.newValue)) {
        setThemeState(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setTheme = (nextTheme) => {
    if (THEMES.includes(nextTheme)) {
      setThemeState(nextTheme);
    }
  };

  return {
    theme,
    setTheme,
    resolvedTheme,
    themes: THEMES,
  };
}
