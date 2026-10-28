"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "light" | "dark" | "system";

/** localStorage key — must match the inline anti-flash script in the root layout. */
export const THEME_STORAGE_KEY = "knowra-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches;
}

/** Resolve a theme preference to the actually-applied mode. */
function resolve(theme: Theme): "light" | "dark" {
  if (theme === "system") return systemPrefersDark() ? "dark" : "light";
  return theme;
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", resolve(theme) === "dark");
}

type ThemeContextValue = {
  /** The user's preference: light, dark, or follow the system. */
  theme: Theme;
  /** The mode currently applied once `system` is resolved. */
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start as "system" on both server and client so hydration matches; the
  // stored preference is read in an effect below.
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Load the saved preference once mounted.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored);
      }
    } catch {
      // Private mode / blocked storage — fall back to "system".
    }
  }, []);

  // Apply the theme and keep it in sync with OS changes while on "system".
  useEffect(() => {
    applyTheme(theme);
    setResolvedTheme(resolve(theme));

    const mql = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      if (theme === "system") {
        applyTheme("system");
        setResolvedTheme(resolve("system"));
      }
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore — the preference just won't persist across reloads.
    }
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
