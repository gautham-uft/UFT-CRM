"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark1" | "dark2" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark1", setTheme: () => {} });

function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("crm-theme") as Theme) ?? "dark1";
    }
    return "dark1";
  });

  /* Apply on first render and whenever theme changes */
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  /* Sync on mount in case HTML attr differs from localStorage */
  useEffect(() => {
    const saved = (localStorage.getItem("crm-theme") as Theme) ?? "dark1";
    setThemeState(saved);
    applyTheme(saved);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("crm-theme", t);
    applyTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
