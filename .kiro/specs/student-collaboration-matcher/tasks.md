# Implementation Plan: Connexus Student Collaboration Matcher

## Overview

Implement the core Match Algorithm feature for Connexus in five dependency-ordered groups:
1. Supabase SQL schema and RLS policies (data foundation)
2. `lib/match-engine` TypeScript module (pure scoring logic)
3. `POST /api/match` route handler with auth (API layer)
4. `ScoreRing`, `MatchCard`, `MatchResultsList` UI components (result display)
5. `ThemeProvider` + `ModeToggle` (dark/light mode)

Each group builds on the previous. No group should be started until its dependencies are complete.

---

## Tasks

- [x] 1. Supabase SQL schema and RLS policies
  - [x] 1.1 Create `profiles` table with all required columns, constraints, and trigger
    - Create the `profiles` table with columns: `id`, `user_id`, `full_name`, `college`, `program`, `year_level` (check 1–5), `skill_tags`, `interest_tags`, `project_needs` (JSONB), `availability_hours_per_week` (check ≥ 0), `is_active`, `created_at`, `updated_at`
    - Add `UNIQUE` constraint on `user_id`
    - Create `set_updated_at()` trigger function and attach it as `profiles_updated_at` (`BEFORE UPDATE`)
    - Add `project_needs_role_required` CHECK constraint validating every JSONB array element contains a `role` key
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [x] 1.2 Create `weights` table with sum-to-one constraint and single-active index
    - Create the `weights` table with columns: `id`, `course_weight`, `skills_weight`, `interests_weight`, `project_needs_weight` (all `numeric(5,4)`, check ≥ 0), `is_active`, `created_at`
    - Add `weights_sum_to_one` CHECK constraint: `abs(sum - 1.0) <= 0.001`
    - Create partial unique index `weights_single_active` on `(is_active) WHERE is_active = true`
    - Seed one active row with weights `(0.3, 0.3, 0.2, 0.2)`
    - _Requirements: 1.6, 1.7_

  - [x] 1.3 Create `match_requests` table
    - Create the `match_requests` table with columns: `id`, `requester_id` (FK → `profiles.id` ON DELETE CASCADE), `filters` (JSONB), `result_count`, `executed_at`, `weight_snapshot` (JSONB)
    - _Requirements: 9.1_

  - [x] 1.4 Enable Row-Level Security and create all RLS policies
    - Enable RLS on `profiles`, `weights`, and `match_requests`
    - `profiles`: `SELECT` policy — `is_active = true`; `INSERT` policy — `auth.uid() = user_id`; `UPDATE` policy — `auth.uid() = user_id`
    - `weights`: `SELECT` policy — `auth.role() = 'authenticated'`
    - `match_requests`: `ALL` policy — `requester_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())`
    - _Requirements: 1.1, 9.1_

  - [ ]* 1.5 Write integration tests for schema constraints
    - Test that inserting a `project_needs` entry without `role` is rejected
    - Test that a `weights` row with sum ≠ 1.0 (± 0.001) is rejected
    - Test that inserting a second `weights` row with `is_active = true` is rejected
    - Test that `updated_at` is automatically updated on profile row update
    - _Requirements: 1.2, 1.3, 1.5, 1.6, 1.7_

- [x] 2. `lib/match-engine` TypeScript module
  - [x] 2.1 Define shared TypeScript interfaces in `lib/match-engine/types.ts`
    - Export `Profile`, `ProjectNeed`, `WeightConfig`, `ScoreBreakdown`, `RankedResult`, `MatchRequest`, `MatchResult` interfaces exactly as specified in the design
    - Export typed error classes: `NotFoundError`, `ConfigError`, `ValidationError`, `UnauthorizedError` (all extending `Error`)
    - _Requirements: 1.1, 7.1, 8.3_

  - [x] 2.2 Implement pure scoring functions in `lib/match-engine/scoring.ts`
    - Implement `normaliseTag(tag: string): string` — `trim()` + `toLowerCase()`
    - Implement `computeCourseScore(rProgram, rCollege, cProgram, cCollege): number` — returns exactly `1.0 | 0.6 | 0.0` using normalised comparison
    - Implement `computeJaccardScore(tagsA, tagsB): string[]` — Jaccard `|A ∩ B| / |A ∪ B|`; empty ∩ empty → `0.0`
    - Implement `computeProjectNeedsScore(needs, candidateSkillTags): number` — `satisfied / total`; zero needs → `0.0`
    - Implement `computeWeightedScore(breakdown, weights): number` — weighted sum × 100, rounded to 2 dp
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2_

  - [ ]* 2.3 Write property test: `normaliseTag` is idempotent (Property 1)
    - **Property 1: Tag normalisation is idempotent**
    - Use `fc.string()` to generate arbitrary tag strings; assert `normaliseTag(normaliseTag(t)) === normaliseTag(t)`
    - Run minimum 100 iterations
    - **Validates: Requirements 1.4, 3.4, 4.3, 5.3, 6.5**

  - [ ]* 2.4 Write property test: `computeCourseScore` returns only 1.0, 0.6, or 0.0 (Property 4)
    - **Property 4: Course score is exactly 1.0, 0.6, or 0.0 based on program/college match**
    - Use `fc.record({ program: fc.string(), college: fc.string() })` for requester and candidate; assert result is one of `[0.0, 0.6, 1.0]`
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ]* 2.5 Write property test: `computeCourseScore` is case- and whitespace-insensitive (Property 5)
    - **Property 5: Course score is case-insensitive and whitespace-insensitive**
    - Generate program/college strings; assert that adding leading/trailing whitespace or changing case does not change the score
    - **Validates: Requirements 3.4**

  - [ ]* 2.6 Write property test: `computeJaccardScore` equals `|A ∩ B| / |A ∪ B|` (Property 6)
    - **Property 6: Jaccard score equals |intersection| / |union| for all non-empty tag pairs**
    - Use `fc.array(fc.string({ minLength: 1 }), { minLength: 1 })` for both arrays; compute expected value independently and assert equality
    - **Validates: Requirements 4.1, 5.1**

  - [ ]* 2.7 Write property test: `computeJaccardScore` is always in [0.0, 1.0] (Property 7)
    - **Property 7: Jaccard score is always in [0.0, 1.0]**
    - Use `fc.array(fc.string())` (including empty arrays); assert `0.0 <= result <= 1.0`
    - **Validates: Requirements 4.4, 5.4**

  - [ ]* 2.8 Write property test: `computeProjectNeedsScore` equals `satisfied / total` (Property 8)
    - **Property 8: Project needs score equals satisfied_count / total_needs**
    - Generate `ProjectNeed[]` and candidate skill arrays; compute expected fraction independently and assert equality
    - **Validates: Requirements 6.1, 6.2, 6.4, 6.5**

  - [ ]* 2.9 Write property test: `computeWeightedScore` is always in [0.0, 100.0] (Property 9)
    - **Property 9: Weighted score is always in [0.0, 100.0]**
    - Generate `ScoreBreakdown` with all values in [0, 1] and `WeightConfig` with non-negative weights summing to 1.0; assert `0.0 <= result <= 100.0`
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 2.10 Write unit tests for scoring functions with concrete examples
    - `computeCourseScore`: exact program match → 1.0; same college, different program → 0.6; different college → 0.0; case/whitespace variants
    - `computeJaccardScore`: identical sets → 1.0; disjoint sets → 0.0; partial overlap; both empty → 0.0
    - `computeProjectNeedsScore`: all needs satisfied → 1.0; none satisfied → 0.0; partial → fraction; zero needs → 0.0; partial skill match counts as unsatisfied
    - `computeWeightedScore`: known inputs produce expected rounded output
    - _Requirements: 3.1–3.4, 4.1–4.4, 5.1–5.4, 6.1–6.5, 7.1–7.2_

  - [x] 2.11 Implement candidate filtering in `lib/match-engine/filtering.ts`
    - Export `filterCandidates(candidates: Profile[], requester: Profile, minAvailability?: number): Profile[]`
    - Exclude requester's own profile (`user_id` equality)
    - Exclude profiles where `is_active = false`
    - Exclude profiles where `updated_at` is older than 365 days from now
    - Exclude profiles where `availability_hours_per_week < minAvailability` (when provided)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 2.12 Write property test: filtered candidate pool satisfies all filter invariants (Property 3)
    - **Property 3: Candidate pool contains only active, non-requester, non-stale, availability-filtered profiles**
    - Generate arbitrary `Profile[]` and filter parameters; assert every result satisfies all four filter conditions simultaneously
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x] 2.13 Implement `runMatchEngine` orchestrator in `lib/match-engine/index.ts`
    - Fetch requester profile; throw `NotFoundError` if not found or `is_active = false`
    - Fetch active weights row; throw `ConfigError` if none exists
    - Fetch all candidate profiles from Supabase; apply `filterCandidates`
    - For each candidate compute `ScoreBreakdown` using the four scoring functions, then `computeWeightedScore`
    - Sort results: descending `score`, then ascending `full_name` (tiebreaker)
    - Slice to `request.limit ?? 10`
    - Persist `match_requests` record with `executed_at` set to the timestamp captured before scoring begins
    - Return `MatchResult` with `results`, `total_candidates_evaluated`, and `weight_snapshot`
    - _Requirements: 2.1–2.4, 7.3, 7.4, 8.1–8.5, 9.1–9.3, 11.1, 11.2_

  - [ ]* 2.14 Write property test: ranked results are sorted correctly (Property 10)
    - **Property 10: Ranked results are sorted by score descending, then full_name ascending**
    - Generate arbitrary `RankedResult[]`; run the sort logic; assert every consecutive pair satisfies `score[i] > score[i+1]` OR (`score[i] === score[i+1]` AND `full_name[i] <= full_name[i+1]`)
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 2.15 Write property test: limit bounds the result count (Property 11)
    - **Property 11: Limit parameter bounds the result count**
    - Use `fc.integer({ min: 1, max: 50 })` for limit and `fc.array(...)` for candidate pool; assert `results.length <= limit`
    - **Validates: Requirements 8.4**

  - [ ]* 2.16 Write property test: Match Engine is deterministic (Property 12)
    - **Property 12: Match Engine is deterministic**
    - Generate a fixed requester, candidate pool, and weight config; invoke the scoring pipeline twice; assert the two `RankedResult[]` arrays are deeply equal
    - **Validates: Requirements 11.1, 11.2**

  - [ ]* 2.17 Write property test: profile JSON round-trip preserves score (Property 13)
    - **Property 13: Profile serialisation round-trip preserves score**
    - Generate a `Profile`; serialise to JSON and deserialise; assert the score computed from both is identical
    - **Validates: Requirements 11.3**

- [ ] 3. Checkpoint — match engine complete
  - Ensure all non-optional tests pass. Confirm scoring functions, filtering, and `runMatchEngine` behave correctly before wiring the API layer. Ask the user if any questions arise.

- [x] 4. `POST /api/match` route handler
  - [x] 4.1 Create Supabase server client helper in `lib/supabase/server.ts`
    - Export `createServerClient()` using `@supabase/ssr` (or the project's existing Supabase helper pattern) that reads cookies/headers for the session
    - _Requirements: 10.6_

  - [x] 4.2 Implement `app/api/match/route.ts` route handler
    - Call `createServerClient()` and `supabase.auth.getUser()`; return `401` if auth fails
    - Parse JSON body; return `400` if `requester_id` is missing
    - Validate `limit`: must be an integer in [1, 50]; return `400` with descriptive message if invalid
    - Call `runMatchEngine(supabase, { requester_id, min_availability_hours, limit })`
    - Map `NotFoundError` → `404`, `ConfigError` → `500`, all other errors → `500`; never expose stack traces
    - Return `200` with `MatchResult` JSON on success
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 4.3 Write unit tests for the route handler
    - Mock `createServerClient` and `runMatchEngine`
    - Test 200 response with valid body and authenticated session
    - Test 401 when `getUser()` returns an error or null user
    - Test 400 when `requester_id` is missing
    - Test 400 when `limit` is 0, 51, or non-integer
    - Test 404 when `runMatchEngine` throws `NotFoundError`
    - Test 500 when `runMatchEngine` throws an unexpected error; assert no stack trace in body
    - _Requirements: 10.1–10.6_

- [x] 5. `ScoreRing`, `MatchCard`, and `MatchResultsList` UI components
  - [x] 5.1 Implement `ScoreRing` Client Component in `components/match/ScoreRing.tsx`
    - Accept props: `score: number` (0–100), `size?: number` (default 80), `strokeWidth?: number` (default 6), `animate?: boolean`
    - Render two concentric SVG `<circle>` elements: full track + progress arc using `stroke-dasharray` / `stroke-dashoffset`
    - Progress arc colour: UST gold `#F5A623`
    - Add `aria-label="Compatibility score: {score} out of 100"` on the wrapping SVG for screen reader accessibility
    - Display numeric score label centred inside the ring
    - Apply CSS transition on `stroke-dashoffset` when `animate` is true
    - _Requirements: 8.3 (score display), design ScoreRing spec_

  - [x] 5.2 Implement `MatchCard` Client Component in `components/match/MatchCard.tsx`
    - Accept props: `result: RankedResult`, `index: number`
    - Use semantic HTML: `<article>`, `<h3>` for name, `<ul>` for tag lists
    - Top row: `<ScoreRing score={result.score} animate />` on the left; name, program, college on the right
    - Skill chips row and interest chips row using tag arrays
    - Footer: availability badge (`availability_hours_per_week` hrs/week) + year level
    - Apply staggered entrance animation delay using `index` (e.g., `style={{ animationDelay: \`${index * 60}ms\` }}`)
    - Ensure colour contrast meets WCAG 2.1 AA (4.5:1 for normal text)
    - _Requirements: 8.3_

  - [x] 5.3 Implement `MatchResultsList` Client Component in `components/match/MatchResultsList.tsx`
    - Accept prop: `results: RankedResult[]`
    - Render a responsive CSS grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
    - Map `results` to `<MatchCard result={r} index={i} />` with key on `candidate_id`
    - Show inline error banner (not full-page) when an API error is passed via an `error?: string` prop
    - Show skeleton grid (matching card layout) while loading via a `loading?: boolean` prop to prevent layout shift
    - Show friendly empty-state message with a suggestion to broaden filters when `results` is empty and not loading
    - _Requirements: 8.1, 8.3, 8.5_

  - [ ]* 5.4 Write unit tests for UI components
    - `ScoreRing`: renders correct `stroke-dashoffset` for score 0, 50, and 100; `aria-label` is present and correct
    - `MatchCard`: renders candidate name, program, score, skill tags, and availability; uses `<article>` and `<h3>`
    - `MatchResultsList`: renders correct number of cards; shows empty state when `results=[]`; shows error banner when `error` prop is set
    - _Requirements: 8.3, 8.5_

- [x] 6. `ThemeProvider` and `ModeToggle`
  - [x] 6.1 Implement `ThemeProvider` Client Component in `components/ui/ThemeProvider.tsx`
    - Read initial theme from `localStorage` key `"theme"` (values `"dark"` | `"light"`); fall back to `window.matchMedia('(prefers-color-scheme: dark)')` if key is absent
    - Apply `dark` class to `document.documentElement` before first paint to avoid flash of unstyled content
    - Expose a React context with `{ theme, toggleTheme }` for child components
    - Wrap children in the context provider
    - _Requirements: design ThemeProvider spec_

  - [x] 6.2 Implement `ModeToggle` Client Component in `components/ui/ModeToggle.tsx`
    - Consume `ThemeProvider` context to read current theme and call `toggleTheme`
    - Render a button with `aria-pressed={theme === 'dark'}` and a visible text label (e.g., "Dark mode" / "Light mode")
    - Persist the chosen theme to `localStorage` on toggle
    - _Requirements: design ModeToggle spec_

  - [x] 6.3 Wrap root layout with `ThemeProvider` in `app/layout.tsx`
    - Import `ThemeProvider` and wrap `{children}` so the theme context is available app-wide
    - Place `<ModeToggle />` in the layout header
    - _Requirements: design ThemeProvider spec_

  - [ ]* 6.4 Write unit tests for `ThemeProvider` and `ModeToggle`
    - `ThemeProvider`: applies `dark` class when `localStorage` has `"dark"`; falls back to `prefers-color-scheme`
    - `ModeToggle`: `aria-pressed` reflects current theme; clicking toggles theme and persists to `localStorage`
    - _Requirements: design ModeToggle / ThemeProvider spec_

- [x] 7. Final checkpoint — wire everything together
  - Create `app/match/page.tsx` as a Server Component that fetches the requester's profile server-side and renders `<MatchResultsList />` with initial data
  - Create `app/match/loading.tsx` as a Suspense fallback skeleton matching the card grid layout
  - Ensure `POST /api/match` is reachable from the client components
  - Ensure all non-optional tests pass, ask the user if any questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use `fast-check` (`fc`) and must be run with Vitest (`vitest --run`)
- Each property test maps 1-to-1 to a numbered property in the design document's "Correctness Properties" section
- All scoring functions in `lib/match-engine/scoring.ts` are pure — no Supabase calls — making them straightforward to property-test
- The route handler is the only place that converts typed errors to HTTP responses; the match engine only throws
- Tailwind v4 uses `@import 'tailwindcss'` in `globals.css` — do not use the v3 `@tailwind` directives
- Read `node_modules/next/dist/docs/` before writing any Next.js-specific code to account for API changes in Next.js 16
