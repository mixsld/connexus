"use client";

/**
 * MatchResultsList — responsive grid of MatchCard components.
 * Redesigned with violet accent, improved empty/error/loading states.
 */

import type { RankedResult } from "@/lib/match-engine/types";
import MatchCard from "./MatchCard";

export interface MatchResultsListProps {
  results: RankedResult[];
  loading?: boolean;
  error?: string;
  currentProfileId?: string;
  compact?: boolean;
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/60 dark:bg-gray-900"
      aria-hidden="true"
    >
      <div className="flex items-start gap-4">
        <div className="h-[72px] w-[72px] shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-3/4 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-1/2 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-2/3 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2 w-14 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-1.5 flex-1 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
      <div className="flex justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="h-10 w-full animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
      <div className="h-10 w-full animate-pulse rounded-xl bg-violet-100 dark:bg-violet-900/20" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-5 py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-900/20">
        <svg
          className="h-10 w-10 text-violet-400 dark:text-violet-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
          />
        </svg>
      </div>
      <div>
        <p className="text-lg font-bold text-gray-900 dark:text-gray-50">No matches found</p>
        <p className="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Try lowering the minimum availability or broadening your project needs to see more collaborators.
        </p>
      </div>
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="col-span-full flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300"
    >
      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

// ── MatchResultsList ──────────────────────────────────────────────────────────

export default function MatchResultsList({
  results,
  loading = false,
  error,
  currentProfileId,
  compact,
}: MatchResultsListProps) {
  return (
    <section aria-label="Match results" aria-busy={loading}>
      {loading && (
        <p className="sr-only" aria-live="polite">Loading match results…</p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {error && <ErrorBanner message={error} />}

        {loading && !error &&
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}

        {!loading && !error && results.length === 0 && <EmptyState />}

        {!loading && !error &&
          results.map((result, i) => (
            <MatchCard
              key={result.candidate_id}
              result={result}
              index={i}
              currentProfileId={currentProfileId}
              compact={compact}
            />
          ))}
      </div>
    </section>
  );
}
