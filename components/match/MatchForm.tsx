"use client";

/**
 * MatchForm — filter form + results orchestrator.
 * Calls POST /api/match and renders MatchResultsList.
 */

import { useCallback, useEffect, useState } from "react";
import type { MatchResult } from "@/lib/match-engine/types";
import MatchResultsList from "./MatchResultsList";

interface MatchFormProps {
  requesterId: string;
}

interface FormState {
  minAvailability: string;
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
      if (!isNaN(minAvail) && minAvail >= 0) body.min_availability_hours = minAvail;
      const limit = parseInt(f.limit, 10);
      if (!isNaN(limit) && limit >= 1 && limit <= 50) body.limit = limit;

      try {
        const res = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(
            res.status === 401
              ? "You must be signed in to find matches."
              : res.status === 404
                ? "Your profile was not found. Please complete your profile first."
                : (data as { message?: string }).message ?? "Something went wrong. Please try again."
          );
          setResult(null);
          return;
        }

        setResult(await res.json());
      } catch {
        setError("Network error — please check your connection and try again.");
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [form, requesterId]
  );

  useEffect(() => {
    runMatch(DEFAULT_FORM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runMatch();
  }

  return (
    <div className="space-y-8">
      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        aria-label="Match filters"
        className={[
          "flex flex-wrap items-end gap-4 rounded-2xl p-5",
          "border border-gray-200 bg-white shadow-xs",
          "dark:border-gray-700/60 dark:bg-gray-900",
        ].join(" ")}
      >
        {/* Min availability */}
        <div className="flex min-w-[140px] flex-1 flex-col gap-1.5">
          <label
            htmlFor="min-availability"
            className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
          >
            Min availability
          </label>
          <div className="relative">
            <input
              id="min-availability"
              type="number"
              min={0}
              max={168}
              placeholder="Any"
              value={form.minAvailability}
              onChange={(e) => setForm((f) => ({ ...f, minAvailability: e.target.value }))}
              className={[
                "w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-14 text-sm",
                "text-gray-900 placeholder:text-gray-400",
                "focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/25",
                "dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500",
                "dark:focus:border-violet-500 dark:focus:bg-gray-800 dark:focus:ring-violet-500/25",
                "transition-all duration-150",
              ].join(" ")}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-gray-400">
              hrs/wk
            </span>
          </div>
        </div>

        {/* Result limit */}
        <div className="flex min-w-[120px] flex-1 flex-col gap-1.5">
          <label
            htmlFor="result-limit"
            className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
          >
            Show top
          </label>
          <select
            id="result-limit"
            value={form.limit}
            onChange={(e) => setForm((f) => ({ ...f, limit: e.target.value }))}
            className={[
              "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm",
              "text-gray-900",
              "focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/25",
              "dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100",
              "dark:focus:border-violet-500 dark:focus:bg-gray-800 dark:focus:ring-violet-500/25",
              "transition-all duration-150",
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
          aria-busy={loading}
          className={[
            "inline-flex min-h-[44px] items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white",
            "bg-violet-600 hover:bg-violet-700 active:bg-violet-800",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
            "shadow-xs shadow-violet-200 dark:shadow-violet-900/30",
            "transition-all duration-150",
            loading ? "cursor-not-allowed opacity-60" : "active:scale-[0.98]",
          ].join(" ")}
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Searching…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
              </svg>
              Find matches
            </>
          )}
        </button>
      </form>

      {/* ── Stats pill ───────────────────────────────────────────────────── */}
      {result && !loading && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-800/50 dark:bg-violet-900/20 dark:text-violet-300">
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
            </svg>
            {result.results.length} of {result.total_candidates_evaluated} candidates
          </span>
        </div>
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
