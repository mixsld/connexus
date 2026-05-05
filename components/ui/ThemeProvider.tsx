"use client";

/**
 * ThemeProvider — manages dark/light mode for the Connexus app.
 *
 * Design spec (design.md):
 *   - Reads initial theme from localStorage key "theme" ("dark" | "light")
 *   - Falls back to window.matchMedia('(prefers-color-scheme: dark)')
 *   - Applies/removes the `dark` class on <html> before first paint to
 *     prevent flash of unstyled content (FOUC)
 *   - Exposes { theme, toggleTheme } via React context for child components
 *
 * Tailwind v4 dark: class strategy — all dark: variants activate when
 * <html> carries the `dark` class.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ── Helpers ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = "theme";

/** Read the persisted theme or fall back to the OS preference. */
function resolveInitialTheme(): Theme {
  // Guard: this runs client-side only
  if (typeof window === "undefined") return "light";

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Apply or remove the `dark` class on <html>. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

// ── Inline script — injected into <head> to prevent FOUC ─────────────────────
// This script runs synchronously before React hydrates, so the correct class
// is already on <html> when the first paint happens.
const FOUC_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e){}
})();
`.trim();

// ── ThemeProvider ─────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // Sync with localStorage + OS preference on mount (client only)
  useEffect(() => {
    const initial = resolveInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // localStorage may be unavailable in some environments
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {/*
       * Inline script injected before children to prevent FOUC.
       * dangerouslySetInnerHTML is intentional and safe here — the script
       * content is a static string defined in this module, not user input.
       */}
      <script
        dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }}
        suppressHydrationWarning
      />
      {children}
    </ThemeContext.Provider>
  );
}

// ── useTheme hook ─────────────────────────────────────────────────────────────

/**
 * Consume the theme context.
 * Must be used inside a <ThemeProvider> tree.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
