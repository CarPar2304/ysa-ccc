import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export const useThemePreference = (): Theme => {
  const [theme, setTheme] = useState<Theme>(() => {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  useEffect(() => {
    const updateTheme = () => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    };

    // Listen for custom theme change events from ThemeToggle
    window.addEventListener("themechange", updateTheme);

    // Listen for storage changes (multi-tab sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "theme") {
        updateTheme();
      }
    };
    window.addEventListener("storage", handleStorage);

    // Listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => {
      // Only apply if no saved theme
      if (!localStorage.getItem("theme")) {
        updateTheme();
      }
    };
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener("themechange", updateTheme);
      window.removeEventListener("storage", handleStorage);
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  return theme;
};
