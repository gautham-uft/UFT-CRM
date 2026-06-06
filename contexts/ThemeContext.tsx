"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

export type Theme = "dark1" | "dark2" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark1", setTheme: () => {} });

function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
}

// The saved theme lives in localStorage, which is a client-only "external store".
// Reading it via useSyncExternalStore (server snapshot = "dark1") keeps the first
// client render identical to the server render — no hydration mismatch — while
// still reflecting the real saved theme immediately after.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (typeof window !== "undefined") window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", cb);
  };
}
function getSnapshot(): Theme {
  return (localStorage.getItem("crm-theme") as Theme) || "dark1";
}
function getServerSnapshot(): Theme {
  return "dark1";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /* Keep the DOM attribute in sync with the active theme (DOM side-effect). */
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    localStorage.setItem("crm-theme", t);
    applyTheme(t);
    listeners.forEach((l) => l());
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
