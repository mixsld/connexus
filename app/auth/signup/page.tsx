"use client";

/**
 * Sign-up page — email + password account creation via Supabase.
 *
 * - Uses createBrowserClient from @supabase/ssr (singleton, cookie-based session)
 * - Calls supabase.auth.signUp()
 * - On success: if email confirmation is required, shows a confirmation notice;
 *   otherwise redirects to /match immediately
 * - Inline error display — no full-page error states
 * - Client-side validation: password length ≥ 8, passwords match
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

// ── Field-level error message ─────────────────────────────────────────────────

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SignUpPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);

  // ── Client-side validation ──────────────────────────────────────────────────
  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = "Full name is required.";
    }
    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);

    if (!validate()) return;

    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          // Store full_name in user metadata so it's available before profile creation
          full_name: fullName.trim(),
        },
      },
    });

    if (authError) {
      setGlobalError(
        authError.message.toLowerCase().includes("already registered")
          ? "An account with this email already exists. Try signing in instead."
          : authError.message
      );
      setLoading(false);
      return;
    }

    // Supabase returns a session immediately if email confirmation is disabled,
    // or a user with no session if confirmation is required.
    if (data.session) {
      // Confirmed immediately — go straight to match page
      router.push("/match");
    } else {
      // Email confirmation required — show notice
      setConfirmed(true);
      setLoading(false);
    }
  }

  // ── Confirmation notice ─────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <span
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: "#7C3AED" }}
              aria-hidden="true"
            >
              <svg
                className="h-6 w-6 text-white"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
              </svg>
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">
              Check your email
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              We sent a confirmation link to{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {email}
              </span>
              . Click the link to activate your account.
            </p>
            <a
              href="/auth/login"
              className="mt-6 inline-block text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
            >
              Back to sign in
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Sign-up form ────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {/* Heading */}
          <div className="mb-8 text-center">
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
                <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2.046 15.253c-.058.468.172.92.57 1.175A9.953 9.953 0 0 0 8 18c1.982 0 3.83-.578 5.384-1.573.398-.254.628-.707.57-1.175a7 7 0 0 0-13.908 0ZM15.5 7a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 15.5 7Z" />
              </svg>
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Join Connexus and find your UST collaborator
            </p>
          </div>

          {/* ── Global error banner ───────────────────────────────────── */}
          {globalError && (
            <div
              id="signup-error"
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
              <span>{globalError}</span>
            </div>
          )}

          {/* ── Form ─────────────────────────────────────────────────── */}
          <form
            onSubmit={handleSubmit}
            noValidate
            aria-label="Sign up form"
            className="space-y-5"
          >
            {/* Full name */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="full-name"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Full name
              </label>
              <input
                id="full-name"
                type="text"
                autoComplete="name"
                required
                placeholder="Maria Santos"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                aria-describedby={
                  fieldErrors.fullName ? "error-full-name" : undefined
                }
                aria-invalid={!!fieldErrors.fullName}
                className={fieldErrors.fullName ? inputError : inputNormal}
              />
              {fieldErrors.fullName && (
                <FieldError id="error-full-name" message={fieldErrors.fullName} />
              )}
            </div>

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
                aria-describedby={
                  fieldErrors.email
                    ? "error-email"
                    : globalError
                      ? "signup-error"
                      : undefined
                }
                aria-invalid={!!fieldErrors.email || !!globalError}
                className={
                  fieldErrors.email || globalError ? inputError : inputNormal
                }
              />
              {fieldErrors.email && (
                <FieldError id="error-email" message={fieldErrors.email} />
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={
                  fieldErrors.password ? "error-password" : undefined
                }
                aria-invalid={!!fieldErrors.password}
                className={fieldErrors.password ? inputError : inputNormal}
              />
              {fieldErrors.password && (
                <FieldError id="error-password" message={fieldErrors.password} />
              )}
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirm-password"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-describedby={
                  fieldErrors.confirmPassword
                    ? "error-confirm-password"
                    : undefined
                }
                aria-invalid={!!fieldErrors.confirmPassword}
                className={
                  fieldErrors.confirmPassword ? inputError : inputNormal
                }
              />
              {fieldErrors.confirmPassword && (
                <FieldError
                  id="error-confirm-password"
                  message={fieldErrors.confirmPassword}
                />
              )}
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
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          {/* ── Footer link ───────────────────────────────────────────── */}
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <a
              href="/auth/login"
              className="font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
