/**
 * Shared TypeScript interfaces and typed error classes for the Connexus Match Engine.
 * All types mirror the Supabase `public` schema defined in the SQL migration.
 */

// ─── Domain interfaces ────────────────────────────────────────────────────────

export interface Profile {
  id: string; // UUID — PK in public.profiles
  user_id: string; // UUID — FK to auth.users
  full_name: string;
  college: string;
  program: string;
  year_level: number; // 1–5
  skill_tags: string[]; // lowercase normalised
  interest_tags: string[]; // lowercase normalised
  project_needs: ProjectNeed[];
  availability_hours_per_week: number;
  is_active: boolean;
  updated_at: string; // ISO 8601 timestamptz
}

export interface ProjectNeed {
  role: string;
  required_skills: string[]; // lowercase normalised
}

export interface WeightConfig {
  id: string; // UUID — PK in public.weights
  course_weight: number;
  skills_weight: number;
  interests_weight: number;
  project_needs_weight: number;
  is_active: boolean;
}

// ─── Scoring types ────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  course_score: number; // [0, 1]
  skills_score: number; // [0, 1]
  interests_score: number; // [0, 1]
  project_needs_score: number; // [0, 1]
}

export interface RankedResult {
  candidate_id: string;
  full_name: string;
  college: string;
  program: string;
  year_level: number;
  skill_tags: string[];
  interest_tags: string[];
  availability_hours_per_week: number;
  score: number; // [0, 100], rounded to 2 decimal places
  score_breakdown: ScoreBreakdown;
}

// ─── Request / response types ─────────────────────────────────────────────────

export interface MatchRequest {
  requester_id: string; // UUID
  min_availability_hours?: number;
  limit?: number; // default 10, range [1, 50]
}

export interface MatchResult {
  results: RankedResult[];
  total_candidates_evaluated: number;
  weight_snapshot: Omit<WeightConfig, "id" | "is_active">;
}

// ─── Typed error classes ──────────────────────────────────────────────────────

/**
 * Thrown when the requester profile is not found or is inactive.
 * Maps to HTTP 404 in the route handler.
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
    // Restore prototype chain for instanceof checks across transpilation targets
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a required configuration (e.g. active weights row) is missing.
 * Maps to HTTP 500 in the route handler.
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when request input fails validation (e.g. limit out of range).
 * Maps to HTTP 400 in the route handler.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the caller is not authenticated.
 * Maps to HTTP 401 in the route handler.
 */
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Collaboration types ──────────────────────────────────────────────────────

export type MatchStatus = "interested" | "declined";

export interface Match {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  profile_a_id: string;
  profile_b_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

/** Conversation row joined with both participant profiles */
export interface ConversationWithProfiles extends Conversation {
  profile_a: Pick<Profile, "id" | "full_name" | "program" | "college">;
  profile_b: Pick<Profile, "id" | "full_name" | "program" | "college">;
}
