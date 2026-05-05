/**
 * Connexus Match Engine — public entry point.
 *
 * runMatchEngine() is the only function that touches Supabase. All scoring
 * and filtering logic lives in pure, side-effect-free modules (scoring.ts,
 * filtering.ts) so they can be tested without a database connection.
 *
 * Determinism guarantee (Requirement 11): given the same requester profile,
 * candidate pool, and active weight configuration, this function always
 * returns an identical RankedResult list.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { filterCandidates } from "./filtering";
import {
  computeCourseScore,
  computeJaccardScore,
  computeProjectNeedsScore,
  computeWeightedScore,
} from "./scoring";
import {
  ConfigError,
  NotFoundError,
  type MatchRequest,
  type MatchResult,
  type Profile,
  type RankedResult,
  type ScoreBreakdown,
  type WeightConfig,
} from "./types";

// ─── Supabase fetch helpers ───────────────────────────────────────────────────

async function fetchRequesterProfile(
  supabase: SupabaseClient,
  requesterId: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", requesterId)
    .single();

  if (error || !data) {
    throw new NotFoundError(
      `No active profile found for requester_id: ${requesterId}`
    );
  }

  if (!data.is_active) {
    throw new NotFoundError(
      `No active profile found for requester_id: ${requesterId}`
    );
  }

  return data as Profile;
}

async function fetchActiveWeights(
  supabase: SupabaseClient
): Promise<WeightConfig> {
  const { data, error } = await supabase
    .from("weights")
    .select("*")
    .eq("is_active", true)
    .single();

  if (error || !data) {
    throw new ConfigError("No active weight configuration found");
  }

  return data as WeightConfig;
}

async function fetchAllCandidates(
  supabase: SupabaseClient
): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*");

  if (error) {
    throw new Error(`Failed to fetch candidate profiles: ${error.message}`);
  }

  return (data ?? []) as Profile[];
}

async function persistMatchRequest(
  supabase: SupabaseClient,
  params: {
    requester_id: string;
    filters: Record<string, unknown>;
    result_count: number;
    executed_at: string;
    weight_snapshot: Omit<WeightConfig, "id" | "is_active">;
  }
): Promise<void> {
  const { error } = await supabase.from("match_requests").insert({
    requester_id: params.requester_id,
    filters: params.filters,
    result_count: params.result_count,
    executed_at: params.executed_at,
    weight_snapshot: params.weight_snapshot,
  });

  if (error) {
    // Persistence failure is non-fatal for the caller — log but do not throw.
    // The match result is still returned to the user.
    console.error("[match-engine] Failed to persist match_request:", error.message);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run the Connexus Match Engine.
 *
 * Steps (mirrors the algorithm pseudocode in design.md):
 *   1. Capture executedAt timestamp before any scoring begins (Req 9.2)
 *   2. Fetch and validate the requester profile (Req 2.1)
 *   3. Fetch the active weight configuration (Req 2.4)
 *   4. Fetch all candidate profiles and apply filters (Req 2.1–2.3)
 *   5. Score each candidate across four dimensions (Req 3–6)
 *   6. Aggregate into a weighted score (Req 7)
 *   7. Sort: descending score, then ascending full_name tiebreaker (Req 8.1–8.2)
 *   8. Slice to limit (Req 8.4)
 *   9. Persist match_request record with weight snapshot (Req 9.1–9.3)
 *  10. Return MatchResult (Req 8.3, 8.5)
 *
 * @param supabase  Injected Supabase client (server or browser)
 * @param request   Match request parameters
 * @throws NotFoundError   if the requester profile is missing or inactive
 * @throws ConfigError     if no active weight row exists
 * @throws Error           on unexpected database failures
 */
export async function runMatchEngine(
  supabase: SupabaseClient,
  request: MatchRequest
): Promise<MatchResult> {
  // Step 1 — capture timestamp before scoring (Req 9.2)
  const executedAt = new Date().toISOString();

  // Step 2 — fetch and validate requester
  const requester = await fetchRequesterProfile(supabase, request.requester_id);

  // Step 3 — fetch active weight configuration (Req 2.4)
  const weights = await fetchActiveWeights(supabase);

  // Step 4 — fetch all candidates and apply filters
  const allCandidates = await fetchAllCandidates(supabase);
  const candidates = filterCandidates(
    allCandidates,
    requester,
    request.min_availability_hours
  );

  // Step 5 & 6 — score each candidate
  const scored: RankedResult[] = candidates.map((candidate) => {
    const breakdown: ScoreBreakdown = {
      course_score: computeCourseScore(
        requester.program,
        requester.college,
        candidate.program,
        candidate.college
      ),
      skills_score: computeJaccardScore(
        requester.skill_tags,
        candidate.skill_tags
      ),
      interests_score: computeJaccardScore(
        requester.interest_tags,
        candidate.interest_tags
      ),
      project_needs_score: computeProjectNeedsScore(
        requester.project_needs,
        candidate.skill_tags
      ),
    };

    const score = computeWeightedScore(breakdown, weights);

    return {
      candidate_id: candidate.id,
      full_name: candidate.full_name,
      college: candidate.college,
      program: candidate.program,
      year_level: candidate.year_level,
      skill_tags: candidate.skill_tags,
      interest_tags: candidate.interest_tags,
      availability_hours_per_week: candidate.availability_hours_per_week,
      score,
      score_breakdown: breakdown,
    };
  });

  // Step 7 — sort: descending score, ascending full_name tiebreaker (Req 8.1–8.2)
  scored.sort(
    (a, b) => b.score - a.score || a.full_name.localeCompare(b.full_name)
  );

  // Step 8 — slice to limit (Req 8.4); default 10
  const limit = request.limit ?? 10;
  const ranked = scored.slice(0, limit);

  // Step 9 — persist match_request record (Req 9.1–9.3)
  const weightSnapshot: Omit<WeightConfig, "id" | "is_active"> = {
    course_weight: weights.course_weight,
    skills_weight: weights.skills_weight,
    interests_weight: weights.interests_weight,
    project_needs_weight: weights.project_needs_weight,
  };

  await persistMatchRequest(supabase, {
    requester_id: requester.id,
    filters: {
      min_availability_hours: request.min_availability_hours,
      limit,
    },
    result_count: ranked.length,
    executed_at: executedAt,
    weight_snapshot: weightSnapshot,
  });

  // Step 10 — return result (Req 8.3, 8.5)
  return {
    results: ranked,
    total_candidates_evaluated: candidates.length,
    weight_snapshot: weightSnapshot,
  };
}
