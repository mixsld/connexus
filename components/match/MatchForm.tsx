"use client";

/**
 * MatchForm — Client Component that owns the filter form state and
 * calls POST /api/match, then renders results via MatchResultsList.
 *
 * Receives the requester's profile id from the Server Component parent
 * so no client-side profile fetch is needed.
 */

import { useCallback, useEffect, useState } from "react";
import type { MatchResult } from "@/lib/match-engine/types";
import MatchResultsList from "./MatchResultsList";

interface MatchFormProps {
  requesterId: string;
  /** Current user's profile id for the Interested button */
  
}

interface FormState {
  minAvailability: string; // string for controlled input
  limit: string;
}

const DEFAULT_FORM: FormState = { minAvailability: "", limit: "10" };

export default function MatchForm({ requesterId }: MatchFormProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const runMatch = useCallback(
    async (overrideForm?: FormState) => {
      const f = overrideForm ?? form;
      setLoading(true);
      setError(undefined);

      const body: Record<string, unknown> = { requester_id: requesterId };

      const minAvail = parseInt(f.minAvailability, 10);
      if (!isNaN(minAvail) && minAvail >= 0) {
        body.min_availability_hours = minAvail;
      }

      const limit = parseInt(f.limit, 10);
      if (!isNaN(limit) && limit >= 1 && limit <= 50) {
        body.limit = limit;
      }

      try {
        const res = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const msg =
            res.status === 401
              ? "You must be signed in to find matches."
              : res.status === 404
                ? "Your profile was not found. Please complete your profile first."
                : (data as { message?: string }).message ??
                  "Something went wrong. Please try again.";
          setError(msg);
          setResult(null);
          return;
        }

        const data: MatchResult = await res.json();
        setResult(data);
      } catch {
        setError("Network error — please check your connection and try again.");
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [form, requesterId]
  );

  // Run an initial match on mount with default filters
  useEffect(() => {
    runMatch(DEFAULT_FORM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runMatch();
  }

  return (
    <div className="space-y-6">
      {/* ── Filter form ──────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-5"
        aria-label="Match filters"
      >
        {/* Min availability */}
        <div className="flex min-w-[140px] flex-1 flex-col gap-1">
          <label
            htmlFor="min-availability"
            className="text-xs font-medium text-gray-600 dark:text-gray-400"
          >
            Min availability (hrs/wk)
          </label>
          <input
            id="min-availability"
            type="number"
            min={0}
            max={168}
            placeholder="Any"
            value={form.minAvailability}
            onChange={(e) =>
              setForm((f) => ({ ...f, minAvailability: e.target.value }))
            }
            className={[
              "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm",
              "text-gray-900 placeholder:text-gray-400",
              "focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30",
              "dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500",
              "dark:focus:border-amber-500 dark:focus:ring-amber-500/30",
            ].join(" ")}
          />
        </div>

        {/* Result limit */}
        <div className="flex min-w-[120px] flex-1 flex-col gap-1">
          <label
            htmlFor="result-limit"
            className="text-xs font-medium text-gray-600 dark:text-gray-400"
          >
            Show top
          </label>
          <select
            id="result-limit"
            value={form.limit}
            onChange={(e) =>
              setForm((f) => ({ ...f, limit: e.target.value }))
            }
            className={[
              "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm",
              "text-gray-900",
              "focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30",
              "dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
              "dark:focus:border-amber-500 dark:focus:ring-amber-500/30",
            ].join(" ")}
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={String(n)}>
                {n} matches
              </option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={[
            "inline-flex min-h-[40px] items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold",
            "text-gray-900",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500",
            "transition-all duration-150",
            loading
              ? "cursor-not-allowed opacity-60"
              : "hover:brightness-95 active:scale-[0.98]",
          ].join(" ")}
          style={{ backgroundColor: "#F5A623" }}
          aria-busy={loading}
        >
          {loading ? (
            <>
              {/* Spinner */}
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
              Finding matches…
            </>
          ) : (
            "Find matches"
          )}
        </button>
      </form>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      {result && !loading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing{" "}
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {result.results.length}
          </span>{" "}
          of{" "}
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {result.total_candidates_evaluated}
          </span>{" "}
          candidates evaluated
        </p>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      <MatchResultsList
        results={result?.results ?? []}
        loading={loading}
        error={error}
        currentProfileId={requesterId}
      />
    </div>
  );
}
