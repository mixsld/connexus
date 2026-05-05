"use client";

/**
 * ModeToggle — dark / light mode toggle button.
 *
 * Design spec (design.md):
 *   - Consumes ThemeProvider context via useTheme()
 *   - aria-pressed reflects current theme (true = dark mode active)
 *   - Visible label text ("Dark mode" / "Light mode") for accessibility
 *   - Persists chosen theme to localStorage (handled inside ThemeProvider)
 *   - WCAG 2.1 AA: focus ring, minimum 44×44 px touch target, visible label
 */

import { useTheme } from "./ThemeProvider";

// ── Icons ─────────────────────────────────────────────────────────────────────

function SunIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.06ZM5.404 6.464a.75.75 0 0 0 1.06-1.06L5.404 4.343a.75.75 0 1 0-1.06 1.06l1.06 1.061Z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ── ModeToggle ────────────────────────────────────────────────────────────────

export default function ModeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={[
        // Minimum 44×44 px touch target (WCAG 2.5.5)
        "inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-xl px-3 py-2",
        // Typography
        "text-sm font-medium",
        // Colours — light mode
        "bg-gray-100 text-gray-700 hover:bg-gray-200",
        // Colours — dark mode
        "dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
        // Focus ring — WCAG 2.4.7 visible focus
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500",
        // Smooth transition
        "transition-colors duration-150",
      ].join(" ")}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      {/* Visible label — required for WCAG 1.3.1 / 4.1.2 */}
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
