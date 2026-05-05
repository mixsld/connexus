/**
 * Pure scoring functions for the Connexus Match Engine.
 *
 * All functions are deterministic and side-effect free — no Supabase calls,
 * no timestamps, no random values. Given the same inputs they always return
 * the same output (Requirement 11).
 */

import type { ProjectNeed, ScoreBreakdown, WeightConfig } from "./types";

// ─── Normalisation ────────────────────────────────────────────────────────────

/**
 * Normalise a tag or label string: trim whitespace and convert to lowercase.
 * Applying this function twice is idempotent: normaliseTag(normaliseTag(s)) === normaliseTag(s).
 */
export function normaliseTag(tag: string): string {
  return tag.trim().toLowerCase();
}

// ─── Course / major score ─────────────────────────────────────────────────────

/**
 * Compute the course/major compatibility score between a requester and a candidate.
 *
 * Returns:
 *   1.0  — programs match exactly (case-insensitive, whitespace-trimmed)
 *   0.6  — colleges match but programs differ
 *   0.0  — neither program nor college matches
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export function computeCourseScore(
  requesterProgram: string,
  requesterCollege: string,
  candidateProgram: string,
  candidateCollege: string
): number {
  if (normaliseTag(requesterProgram) === normaliseTag(candidateProgram)) {
    return 1.0;
  }
  if (normaliseTag(requesterCollege) === normaliseTag(candidateCollege)) {
    return 0.6;
  }
  return 0.0;
}

// ─── Jaccard similarity ───────────────────────────────────────────────────────

/**
 * Compute the Jaccard similarity coefficient between two tag arrays.
 *
 * Formula: |A ∩ B| / |A ∪ B|
 * Edge case: both arrays empty → 0.0 (no information to compare).
 * Tags are normalised to lowercase before set operations.
 *
 * Returns a value in [0.0, 1.0].
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4
 */
export function computeJaccardScore(
  tagsA: string[],
  tagsB: string[]
): number {
  const setA = new Set(tagsA.map(normaliseTag));
  const setB = new Set(tagsB.map(normaliseTag));

  if (setA.size === 0 && setB.size === 0) {
    return 0.0;
  }

  let intersectionSize = 0;
  for (const tag of setA) {
    if (setB.has(tag)) {
      intersectionSize++;
    }
  }

  // |A ∪ B| = |A| + |B| - |A ∩ B|
  const unionSize = setA.size + setB.size - intersectionSize;

  return intersectionSize / unionSize;
}

// ─── Project needs score ──────────────────────────────────────────────────────

/**
 * Compute the project-needs compatibility score.
 *
 * For each ProjectNeed in the requester's list, checks whether the candidate's
 * skill_tags contain ALL required_skills for that need. Partial matches do NOT
 * count as satisfied.
 *
 * Formula: satisfied_count / total_needs
 * Edge case: zero needs → 0.0
 *
 * Returns a value in [0.0, 1.0].
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export function computeProjectNeedsScore(
  requesterNeeds: ProjectNeed[],
  candidateSkillTags: string[]
): number {
  if (requesterNeeds.length === 0) {
    return 0.0;
  }

  const candidateSkills = new Set(candidateSkillTags.map(normaliseTag));

  const satisfiedCount = requesterNeeds.filter((need) =>
    need.required_skills.every((skill) =>
      candidateSkills.has(normaliseTag(skill))
    )
  ).length;

  return satisfiedCount / requesterNeeds.length;
}

// ─── Weighted aggregation ─────────────────────────────────────────────────────

/**
 * Aggregate the four dimension scores into a final compatibility score.
 *
 * Formula: (Σ dimension_score × dimension_weight) × 100
 * Result is rounded to 2 decimal places and lies in [0.0, 100.0].
 *
 * Requirements: 7.1, 7.2
 */
export function computeWeightedScore(
  breakdown: ScoreBreakdown,
  weights: WeightConfig
): number {
  const raw =
    breakdown.course_score * weights.course_weight +
    breakdown.skills_score * weights.skills_weight +
    breakdown.interests_score * weights.interests_weight +
    breakdown.project_needs_score * weights.project_needs_weight;

  // Multiply by 100 and round to 2 decimal places
  return Math.round(raw * 100 * 100) / 100;
}
