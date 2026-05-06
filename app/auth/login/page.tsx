"use client";

/**
 * Login page — email + password sign-in via Supabase.
 *
 * - Uses createBrowserClient from @supabase/ssr (singleton, cookie-based session)
 * - Calls supabase.auth.signInWithPassword()
 * - Redirects to /match on success via router.push
 * - Inline error display — no full-page error states
 * - WCAG 2.1 AA: visible labels, focus rings, aria-describedby for errors,
 *   aria-live for async feedback, min 44px touch targets
 * - Tailwind v4 dark: class strategy
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Shared field styles ───────────────────────────────────────────────────────

const inputBase = [
  "w-full rounded-lg border px-3 py-2.5 text-sm",
  "bg-white text-gray-900 placeholder:text-gray-400",
  "dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500",
  "focus:outline-none focus:ring-2 focus:ring-offset-0",
  "transition-colors duration-150",
].join(" ");

const inputNormal = [
  inputBase,
  "border-gray-300 dark:border-gray-600",
  "focus:border-violet-400 focus:ring-violet-400/30",
  "dark:focus:border-violet-500 dark:focus:ring-violet-500/30",
].join(" ");

const inputError = [
  inputBase,
  "border-red-400 dark:border-red-500",
  "focus:border-red-500 focus:ring-red-400/30",
  "dark:focus:border-red-400 dark:focus:ring-red-400/30",
].join(" ");

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      // Map Supabase error messages to user-friendly copy
      setError(
        authError.message.toLowerCase().includes("invalid")
          ? "Incorrect email or password. Please try again."
          : authError.message
      );
      setLoading(false);
      return;
    }

    // Success — navigate to the match page
    router.push("/match");
  }

  const hasError = error !== null;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* ── Card ─────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {/* Heading */}
          <div className="mb-8 text-center">
            {/* UST gold accent dot */}
            <span
              className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "#7C3AED" }}
              aria-hidden="true"
            >
              <svg
                className="h-5 w-5 text-white"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
              </svg>
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">
              Sign in to Connexus
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Find your ideal UST collaborator
            </p>
          </div>

          {/* ── Inline error banner ───────────────────────────────────── */}
          {hasError && (
            <div
              id="login-error"
              role="alert"
              aria-live="assertive"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300"
            >
              <svg
                className="mt-0.5 h-4 w-4 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* ── Form ─────────────────────────────────────────────────── */}
          <form
            onSubmit={handleSubmit}
            noValidate
            aria-label="Sign in form"
            className="space-y-5"
          >
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@ust.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={hasError ? "login-error" : undefined}
                aria-invalid={hasError}
                className={hasError ? inputError : inputNormal}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Password
                </label>
                <a
                  href="/auth/forgot-password"
                  className="text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                >
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={hasError ? "login-error" : undefined}
                aria-invalid={hasError}
                className={hasError ? inputError : inputNormal}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className={[
                "flex w-full min-h-[44px] items-center justify-center gap-2",
                "rounded-lg px-4 py-2.5 text-sm font-semibold text-white",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
                "transition-all duration-150",
                loading
                  ? "cursor-not-allowed opacity-60"
                  : "hover:brightness-95 active:scale-[0.98]",
              ].join(" ")}
              style={{ backgroundColor: "#7C3AED" }}
            >
              {loading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* ── Footer link ───────────────────────────────────────────── */}
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <a
              href="/auth/signup"
              className="font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
