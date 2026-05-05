/**
 * Candidate pool filtering for the Connexus Match Engine.
 *
 * All filtering is pure and deterministic — no Supabase calls.
 * The function is applied to the in-memory candidate array after
 * fetching all profiles from the database.
 */

import type { Profile } from "./types";

/** Number of milliseconds in 365 days */
const STALE_THRESHOLD_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Filter a pool of candidate profiles according to the match rules.
 *
 * Excludes candidates that:
 *   1. Are the requester themselves (user_id equality)          — Req 2.1
 *   2. Have is_active = false                                   — Req 2.1
 *   3. Have not been updated within the past 365 days (stale)  — Req 2.2
 *   4. Have availability below minAvailability (when provided) — Req 2.3
 *
 * @param candidates   Full list of profiles fetched from Supabase
 * @param requester    The requesting student's profile
 * @param minAvailability  Optional minimum hours/week filter
 * @param now          Optional reference timestamp (defaults to Date.now()); injectable for deterministic testing
 */
export function filterCandidates(
  candidates: Profile[],
  requester: Profile,
  minAvailability?: number,
  now: number = Date.now()
): Profile[] {
  const staleThreshold = now - STALE_THRESHOLD_MS;

  return candidates.filter((candidate) => {
    // 1. Exclude the requester's own profile
    if (candidate.user_id === requester.user_id) {
      return false;
    }

    // 2. Exclude inactive profiles
    if (!candidate.is_active) {
      return false;
    }

    // 3. Exclude stale profiles (not updated within 365 days)
    const updatedAt = new Date(candidate.updated_at).getTime();
    if (updatedAt < staleThreshold) {
      return false;
    }

    // 4. Exclude profiles below the minimum availability threshold
    if (
      minAvailability !== undefined &&
      candidate.availability_hours_per_week < minAvailability
    ) {
      return false;
    }

    return true;
  });
}
