# Requirements Document

## Introduction

This document specifies the requirements for the **Connexus Match Algorithm** — the core feature of the Connexus student collaboration platform for the University of Santo Tomas (UST). The algorithm accepts a requesting student's profile and a pool of candidate student profiles, computes a weighted compatibility score across four dimensions (course/major, skills, interests, and project needs), and returns a ranked list of the most compatible collaborators. This spec covers the scoring logic, the supporting Supabase database schema, and the API contract that the Next.js front-end will consume.

---

## Glossary

- **Connexus**: The UST student collaboration matching web application built on Next.js, Supabase, and Tailwind CSS.
- **Requester**: The authenticated UST student who initiates a match query.
- **Candidate**: Any UST student profile stored in the system that is eligible to be matched against the Requester.
- **Match_Engine**: The server-side module responsible for computing compatibility scores and producing ranked results.
- **Profile**: A Supabase database record containing a student's course, skills, interests, and project needs.
- **Score**: A numeric value in the range [0, 100] representing the compatibility between a Requester and a Candidate.
- **Ranked_Result**: An ordered list of Candidates sorted by Score in descending order.
- **Weight**: A configurable numeric coefficient applied to each scoring dimension; all weights must sum to 1.0.
- **Dimension**: One of the four scoring axes — Course, Skills, Interests, or Project_Needs.
- **Skill_Tag**: A normalised, lowercase string label representing a discrete skill (e.g., `"react"`, `"python"`).
- **Interest_Tag**: A normalised, lowercase string label representing a student interest (e.g., `"machine-learning"`, `"ui-design"`).
- **Project_Need**: A structured record describing a role or capability a student is seeking in a collaborator (e.g., `{ role: "backend-developer", required_skills: ["node", "postgres"] }`).
- **College**: The UST academic college to which a student belongs (e.g., `"College of Information and Computing Sciences"`).
- **Program**: The degree program within a College (e.g., `"BS Computer Science"`).
- **Availability**: A student's self-reported weekly availability in hours.
- **Match_Request**: A Supabase database record capturing a single invocation of the Match_Engine by a Requester.

---

## Requirements

### Requirement 1: Student Profile Storage

**User Story:** As a UST student, I want my academic and personal details stored in a structured profile, so that the Match_Engine can use them to find compatible collaborators.

#### Acceptance Criteria

1. THE Connexus database SHALL store each student profile in a `profiles` table with the following columns: `id` (UUID, primary key), `user_id` (UUID, foreign key to Supabase `auth.users`), `full_name` (text), `college` (text), `program` (text), `year_level` (integer 1–5), `skill_tags` (text array), `interest_tags` (text array), `project_needs` (JSONB array), `availability_hours_per_week` (integer), `is_active` (boolean), `created_at` (timestamptz), `updated_at` (timestamptz).
2. THE Connexus database SHALL enforce a unique constraint on `user_id` in the `profiles` table so that each authenticated user has exactly one profile.
3. WHEN a profile is created or updated, THE Connexus database SHALL automatically set `updated_at` to the current UTC timestamp via a database trigger.
4. THE Connexus database SHALL store each Skill_Tag and Interest_Tag in lowercase normalised form; THE Profile_Service SHALL normalise input strings to lowercase before persisting them.
5. IF a `project_needs` entry is provided, THEN THE Connexus database SHALL validate that each entry contains at minimum a `role` (text) field; entries missing `role` SHALL be rejected with a descriptive error.
6. THE Connexus database SHALL store a `weights` configuration table with columns: `id` (UUID, primary key), `course_weight` (numeric), `skills_weight` (numeric), `interests_weight` (numeric), `project_needs_weight` (numeric), `created_at` (timestamptz), `is_active` (boolean); exactly one row SHALL have `is_active = true` at any time.
7. WHEN the four weight values in an active `weights` row are summed, THE Connexus database constraint SHALL ensure the total equals 1.0 (within a tolerance of 0.001).

---

### Requirement 2: Candidate Pool Retrieval

**User Story:** As a UST student, I want the system to consider only active, eligible students as potential matches, so that I receive relevant and current results.

#### Acceptance Criteria

1. WHEN the Match_Engine is invoked, THE Match_Engine SHALL retrieve all Candidate profiles where `is_active = true` and `user_id` is not equal to the Requester's `user_id`.
2. THE Match_Engine SHALL exclude any Candidate whose profile has not been updated within the past 365 days, treating such profiles as stale.
3. WHERE a minimum availability filter is specified in the Match_Request, THE Match_Engine SHALL exclude Candidates whose `availability_hours_per_week` is less than the specified minimum.
4. THE Match_Engine SHALL retrieve the active Weight configuration row before computing any scores; IF no active Weight row exists, THEN THE Match_Engine SHALL return an error with the message `"No active weight configuration found"`.

---

### Requirement 3: Course/Major Compatibility Scoring

**User Story:** As a UST student, I want the algorithm to reward matches from related academic programs, so that collaborators share relevant domain knowledge.

#### Acceptance Criteria

1. WHEN computing the Course dimension score, THE Match_Engine SHALL assign a score of **1.0** when the Candidate's `program` exactly matches the Requester's `program`.
2. WHEN computing the Course dimension score, THE Match_Engine SHALL assign a score of **0.6** when the Candidate's `college` matches the Requester's `college` but the `program` values differ.
3. WHEN computing the Course dimension score, THE Match_Engine SHALL assign a score of **0.0** when neither the `program` nor the `college` of the Candidate matches those of the Requester.
4. THE Match_Engine SHALL perform all `program` and `college` comparisons in a case-insensitive manner after trimming leading and trailing whitespace.

---

### Requirement 4: Skills Compatibility Scoring

**User Story:** As a UST student, I want the algorithm to measure how much my skill set overlaps with a potential collaborator's, so that I can find students with complementary or shared expertise.

#### Acceptance Criteria

1. WHEN computing the Skills dimension score, THE Match_Engine SHALL calculate the Jaccard similarity coefficient between the Requester's `skill_tags` set and the Candidate's `skill_tags` set using the formula: `|intersection| / |union|`.
2. WHEN both the Requester and the Candidate have empty `skill_tags` arrays, THE Match_Engine SHALL assign a Skills dimension score of **0.0**.
3. THE Match_Engine SHALL treat Skill_Tags as case-insensitive during set operations; tags SHALL be normalised to lowercase before comparison.
4. THE Match_Engine SHALL produce a Skills dimension score in the range [0.0, 1.0].

---

### Requirement 5: Interests Compatibility Scoring

**User Story:** As a UST student, I want the algorithm to account for shared interests, so that I can collaborate with students who are passionate about the same topics.

#### Acceptance Criteria

1. WHEN computing the Interests dimension score, THE Match_Engine SHALL calculate the Jaccard similarity coefficient between the Requester's `interest_tags` set and the Candidate's `interest_tags` set using the formula: `|intersection| / |union|`.
2. WHEN both the Requester and the Candidate have empty `interest_tags` arrays, THE Match_Engine SHALL assign an Interests dimension score of **0.0**.
3. THE Match_Engine SHALL treat Interest_Tags as case-insensitive during set operations; tags SHALL be normalised to lowercase before comparison.
4. THE Match_Engine SHALL produce an Interests dimension score in the range [0.0, 1.0].

---

### Requirement 6: Project Needs Compatibility Scoring

**User Story:** As a UST student, I want the algorithm to evaluate whether a potential collaborator can fulfil the roles I need for my project, so that I find students who complement my gaps.

#### Acceptance Criteria

1. WHEN computing the Project_Needs dimension score, THE Match_Engine SHALL iterate over each Project_Need entry in the Requester's `project_needs` array and check whether the Candidate's `skill_tags` contain all `required_skills` listed in that entry.
2. THE Match_Engine SHALL compute the Project_Needs dimension score as: `(number of Requester project needs fully satisfied by Candidate) / (total number of Requester project needs)`.
3. WHEN the Requester has zero Project_Need entries, THE Match_Engine SHALL assign a Project_Needs dimension score of **0.0**.
4. WHEN the Candidate's `skill_tags` satisfy at least one but not all of the `required_skills` for a given Project_Need entry, THE Match_Engine SHALL count that entry as **not satisfied** (partial matches do not contribute to the numerator).
5. THE Match_Engine SHALL perform `required_skills` matching in a case-insensitive manner after normalising to lowercase.

---

### Requirement 7: Weighted Score Aggregation

**User Story:** As a UST student, I want the final compatibility score to reflect the relative importance of each dimension, so that the ranking is meaningful and configurable.

#### Acceptance Criteria

1. WHEN all four dimension scores have been computed, THE Match_Engine SHALL compute the final Score using the formula:
   `Score = (course_score × course_weight + skills_score × skills_weight + interests_score × interests_weight + project_needs_score × project_needs_weight) × 100`
2. THE Match_Engine SHALL produce a final Score in the range [0, 100], rounded to two decimal places.
3. THE Match_Engine SHALL use the Weight values retrieved from the active `weights` configuration row (Requirement 2, criterion 4) for all score computations in a single Match_Request.
4. THE Match_Engine SHALL apply the same active Weight configuration consistently to every Candidate evaluated within a single Match_Request; Weight values SHALL NOT be re-fetched mid-request.

---

### Requirement 8: Ranked Results Output

**User Story:** As a UST student, I want to receive a ranked list of compatible collaborators, so that I can quickly identify the best matches at the top.

#### Acceptance Criteria

1. WHEN scoring is complete, THE Match_Engine SHALL return a Ranked_Result list sorted by Score in descending order (highest Score first).
2. WHEN two or more Candidates share the same Score, THE Match_Engine SHALL sort those Candidates alphabetically by `full_name` in ascending order as a tiebreaker.
3. THE Match_Engine SHALL include the following fields in each Ranked_Result entry: `candidate_id` (UUID), `full_name` (text), `college` (text), `program` (text), `year_level` (integer), `skill_tags` (text array), `interest_tags` (text array), `availability_hours_per_week` (integer), `score` (numeric), `score_breakdown` (object containing `course_score`, `skills_score`, `interests_score`, `project_needs_score`, each as a numeric value in [0, 1]).
4. WHERE a `limit` parameter is provided in the Match_Request, THE Match_Engine SHALL return at most `limit` entries from the top of the Ranked_Result list; the `limit` value SHALL be a positive integer between 1 and 50 inclusive.
5. IF no Candidates remain after filtering (Requirement 2), THEN THE Match_Engine SHALL return an empty Ranked_Result list and SHALL NOT return an error.

---

### Requirement 9: Match Request Persistence

**User Story:** As a UST student, I want my match queries to be recorded, so that I can review past searches and the system can support analytics.

#### Acceptance Criteria

1. WHEN the Match_Engine completes a match query, THE Connexus database SHALL persist a record in a `match_requests` table with columns: `id` (UUID, primary key), `requester_id` (UUID, foreign key to `profiles.id`), `filters` (JSONB, capturing any availability or limit filters applied), `result_count` (integer), `executed_at` (timestamptz), `weight_snapshot` (JSONB, capturing the four weight values used).
2. THE Connexus database SHALL set `executed_at` to the UTC timestamp at the moment the Match_Engine begins score computation.
3. THE Match_Engine SHALL persist the `weight_snapshot` as a copy of the active Weight values at the time of the request, so that historical records remain accurate even if weights are later changed.

---

### Requirement 10: Match API Endpoint

**User Story:** As a Next.js front-end developer, I want a well-defined API route for triggering matches, so that the UI can request and display ranked results consistently.

#### Acceptance Criteria

1. THE Connexus API SHALL expose a `POST /api/match` route that accepts a JSON body containing: `requester_id` (UUID, required), `min_availability_hours` (integer, optional), `limit` (integer, optional, default 10).
2. WHEN a `POST /api/match` request is received with a valid `requester_id`, THE Connexus API SHALL invoke the Match_Engine and return a JSON response with status 200 containing: `results` (array of Ranked_Result entries), `total_candidates_evaluated` (integer), `weight_snapshot` (object).
3. IF the `requester_id` in the request body does not correspond to an existing active profile, THEN THE Connexus API SHALL return a JSON response with status 404 and a `message` field describing the error.
4. IF the `limit` value is outside the range [1, 50], THEN THE Connexus API SHALL return a JSON response with status 400 and a `message` field describing the validation failure.
5. IF an unexpected server error occurs during match computation, THEN THE Connexus API SHALL return a JSON response with status 500 and a `message` field; THE Connexus API SHALL NOT expose internal stack traces or database error details in the response body.
6. THE Connexus API SHALL require the request to include a valid Supabase session token; IF the token is absent or invalid, THEN THE Connexus API SHALL return a JSON response with status 401.

---

### Requirement 11: Score Determinism and Consistency

**User Story:** As a developer, I want the Match_Engine to produce identical results for identical inputs, so that the system is testable and trustworthy.

#### Acceptance Criteria

1. THE Match_Engine SHALL produce the same Ranked_Result list when invoked multiple times with the same Requester profile, the same Candidate pool, and the same active Weight configuration.
2. THE Match_Engine SHALL NOT use random values, timestamps, or external state during score computation; all inputs to the scoring function SHALL be derived solely from profile data and the active Weight configuration.
3. FOR ALL valid Profile inputs, parsing a Profile record from the database and computing its Score SHALL produce a Score equivalent to computing the Score from the same data serialised to JSON and deserialised back (round-trip property).
