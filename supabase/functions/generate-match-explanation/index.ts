/**
 * Supabase Edge Function: generate-match-explanation
 *
 * POST /functions/v1/generate-match-explanation
 *
 * Request body:
 *   {
 *     requester_profile: ProfileInput,
 *     candidate_profile:  ProfileInput
 *   }
 *
 * Response (200):
 *   { explanation: string }
 *
 * Errors:
 *   400 — missing / invalid body
 *   401 — missing or invalid Supabase anon key
 *   502 — Gemini API error
 *   500 — unexpected server error
 *
 * Environment variables required (set in Supabase dashboard → Edge Functions → Secrets):
 *   GEMINI_API_KEY   — Google AI Studio API key
 *   SUPABASE_ANON_KEY — automatically injected by Supabase runtime (used for auth)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectNeed {
  role: string;
  required_skills: string[];
}

interface ProfileInput {
  full_name: string;
  college: string;
  program: string;
  year_level: number;
  skill_tags: string[];
  interest_tags: string[];
  project_needs: ProjectNeed[];
  availability_hours_per_week: number;
}

interface RequestBody {
  requester_profile: ProfileInput;
  candidate_profile: ProfileInput;
}

interface GeminiCandidate {
  content: {
    parts: { text: string }[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Allow calls from the Next.js front-end
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type",
    },
  });
}

/** Validate that a value is a non-empty string array (or empty array). */
function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

/** Validate a ProjectNeed entry. */
function isProjectNeed(v: unknown): v is ProjectNeed {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.role === "string" &&
    obj.role.trim().length > 0 &&
    isStringArray(obj.required_skills)
  );
}

/** Validate a ProfileInput object. */
function validateProfile(v: unknown, label: string): ProfileInput {
  if (typeof v !== "object" || v === null) {
    throw new TypeError(`${label} must be an object`);
  }
  const p = v as Record<string, unknown>;

  if (typeof p.full_name !== "string" || !p.full_name.trim()) {
    throw new TypeError(`${label}.full_name is required`);
  }
  if (typeof p.college !== "string" || !p.college.trim()) {
    throw new TypeError(`${label}.college is required`);
  }
  if (typeof p.program !== "string" || !p.program.trim()) {
    throw new TypeError(`${label}.program is required`);
  }
  if (
    typeof p.year_level !== "number" ||
    !Number.isInteger(p.year_level) ||
    p.year_level < 1 ||
    p.year_level > 5
  ) {
    throw new TypeError(`${label}.year_level must be an integer between 1 and 5`);
  }
  if (!isStringArray(p.skill_tags)) {
    throw new TypeError(`${label}.skill_tags must be an array of strings`);
  }
  if (!isStringArray(p.interest_tags)) {
    throw new TypeError(`${label}.interest_tags must be an array of strings`);
  }
  if (!Array.isArray(p.project_needs) || !p.project_needs.every(isProjectNeed)) {
    throw new TypeError(
      `${label}.project_needs must be an array of { role, required_skills[] }`
    );
  }
  if (
    typeof p.availability_hours_per_week !== "number" ||
    p.availability_hours_per_week < 0
  ) {
    throw new TypeError(
      `${label}.availability_hours_per_week must be a non-negative number`
    );
  }

  return {
    full_name: p.full_name.trim(),
    college: p.college.trim(),
    program: p.program.trim(),
    year_level: p.year_level,
    skill_tags: p.skill_tags as string[],
    interest_tags: p.interest_tags as string[],
    project_needs: p.project_needs as ProjectNeed[],
    availability_hours_per_week: p.availability_hours_per_week,
  };
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(req: ProfileInput, cand: ProfileInput): string {
  function formatTags(tags: string[]): string {
    return tags.length > 0 ? tags.join(", ") : "none listed";
  }

  function formatNeeds(needs: ProjectNeed[]): string {
    if (needs.length === 0) return "none listed";
    return needs
      .map((n) => {
        const skills =
          n.required_skills.length > 0
            ? ` (needs: ${n.required_skills.join(", ")})`
            : "";
        return `${n.role}${skills}`;
      })
      .join("; ");
  }

  const sameCollege = req.college.toLowerCase() === cand.college.toLowerCase();
  const sameProgram = req.program.toLowerCase() === cand.program.toLowerCase();

  const sharedSkills = req.skill_tags.filter((s) =>
    cand.skill_tags.includes(s)
  );
  const sharedInterests = req.interest_tags.filter((i) =>
    cand.interest_tags.includes(i)
  );

  // Which of the requester's project needs does the candidate satisfy?
  const satisfiedNeeds = req.project_needs.filter((need) =>
    need.required_skills.every((s) => cand.skill_tags.includes(s))
  );

  return `You are a student collaboration assistant for Connexus, a UST (University of Santo Tomas) collaboration matching platform.

Given the two student profiles below, write exactly ONE sentence (max 40 words) that explains in a warm, specific, and encouraging tone why these two students would make great collaborators. Focus on the most compelling overlap: shared skills, complementary project needs, common interests, or academic alignment. Do not use generic phrases like "great match" or "perfect fit". Be concrete.

--- REQUESTER ---
Name: ${req.full_name}
College: ${req.college}
Program: ${req.program} (Year ${req.year_level})
Skills: ${formatTags(req.skill_tags)}
Interests: ${formatTags(req.interest_tags)}
Project needs: ${formatNeeds(req.project_needs)}
Availability: ${req.availability_hours_per_week} hrs/week

--- CANDIDATE ---
Name: ${cand.full_name}
College: ${cand.college}
Program: ${cand.program} (Year ${cand.year_level})
Skills: ${formatTags(cand.skill_tags)}
Interests: ${formatTags(cand.interest_tags)}
Project needs: ${formatNeeds(cand.project_needs)}
Availability: ${cand.availability_hours_per_week} hrs/week

--- CONTEXT ---
Same college: ${sameCollege ? "Yes" : "No"}
Same program: ${sameProgram ? "Yes" : "No"}
Shared skills: ${formatTags(sharedSkills)}
Shared interests: ${formatTags(sharedInterests)}
Requester's needs satisfied by candidate: ${satisfiedNeeds.length} of ${req.project_needs.length}

Respond with only the one-sentence explanation. No preamble, no labels, no quotes.`;
}

// ─── Gemini API call ──────────────────────────────────────────────────────────

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const model = "gemini-2.5-flash";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 80, // one sentence is well under 80 tokens
      candidateCount: 1,
    },
    safetySettings: [
      // Relax safety thresholds for academic content
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data: GeminiResponse = await res.json();

  if (!res.ok || data.error) {
    const msg = data.error?.message ?? `Gemini API returned status ${res.status}`;
    throw new GeminiError(msg, res.status);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new GeminiError("Gemini returned an empty response", 502);
  }

  return text;
}

class GeminiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ── Auth: require Supabase anon key in Authorization header ───────────────
  // The Supabase runtime injects SUPABASE_ANON_KEY automatically.
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!anonKey || token !== anonKey) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON" }, 400);
  }

  if (typeof body !== "object" || body === null) {
    return jsonResponse({ error: "Request body must be a JSON object" }, 400);
  }

  const raw = body as Record<string, unknown>;

  let requesterProfile: ProfileInput;
  let candidateProfile: ProfileInput;

  try {
    requesterProfile = validateProfile(raw.requester_profile, "requester_profile");
    candidateProfile = validateProfile(raw.candidate_profile, "candidate_profile");
  } catch (err) {
    const message = err instanceof TypeError ? err.message : "Invalid request body";
    return jsonResponse({ error: message }, 400);
  }

  // ── Gemini API key ─────────────────────────────────────────────────────────
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) {
    console.error("[generate-match-explanation] GEMINI_API_KEY is not set");
    return jsonResponse(
      { error: "AI service is not configured. Contact the administrator." },
      500
    );
  }

  // ── Build prompt and call Gemini ───────────────────────────────────────────
  const prompt = buildPrompt(requesterProfile, candidateProfile);

  let explanation: string;
  try {
    explanation = await callGemini(prompt, geminiKey);
  } catch (err) {
    if (err instanceof GeminiError) {
      console.error(`[generate-match-explanation] Gemini error: ${err.message}`);
      return jsonResponse(
        { error: "Failed to generate explanation. Please try again." },
        502
      );
    }
    console.error("[generate-match-explanation] Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }

  return jsonResponse({ explanation }, 200);
});
