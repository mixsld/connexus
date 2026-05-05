/**
 * app/match/loading.tsx — Suspense fallback skeleton for the match page.
 *
 * Next.js automatically renders this while app/match/page.tsx is streaming.
 * Matches the layout of the real page to prevent layout shift.
 */

export default function MatchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Page heading skeleton */}
      <div className="mb-8 space-y-3">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-72 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Filter form skeleton */}
      <div className="mb-6 flex flex-wrap gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="h-10 w-44 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-36 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Card grid skeleton — 6 cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            aria-hidden="true"
          >
            {/* Top row */}
            <div className="flex items-start gap-4">
              <div className="h-[72px] w-[72px] shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
            {/* Breakdown bars */}
            <div className="space-y-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex items-center gap-2">
                  <div className="h-2 w-14 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-1.5 flex-1 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="h-5 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"
                />
              ))}
            </div>
            {/* Footer */}
            <div className="flex justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
              <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
