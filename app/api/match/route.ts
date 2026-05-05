/**
 * POST /api/match — Connexus Match Engine Route Handler
 *
 * Accepts a JSON body, validates auth and input, invokes the Match Engine,
 * and returns a ranked list of compatible collaborators.
 *
 * Error mapping (design.md):
 *   401 — missing or invalid Supabase session token        (Req 10.6)
 *   400 — missing requester_id or limit out of [1, 50]     (Req 10.3, 10.4)
 *   404 — requester profile not found or inactive          (Req 10.3)
 *   500 — unexpected server error (no stack trace exposed) (Req 10.5)
 *   200 — success with MatchResult JSON                    (Req 10.2)
 *
 * Internal error details are NEVER included in response bodies (Req 10.5).
 */

import type { NextRequest } from "next/server";
import { runMatchEngine } from "@/lib/match-engine";
import { ConfigError, NotFoundError, ValidationError } from "@/lib/match-engine/types";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest): Promise<Response> {
  // ── Step 1: Authenticate ────────────────────────────────────────────────────
  // Validate the Supabase session from the request cookies.
  // getUser() contacts the Supabase Auth server to verify the token — it does
  // NOT rely on the unverified local session (Req 10.6).
  let supabase: Awaited<ReturnType<typeof createServerClient>>;

  try {
    supabase = await createServerClient();
  } catch {
    // Environment misconfiguration — treat as server error, not auth failure
    return Response.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  // ── Step 2: Parse and validate request body ─────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return Response.json(
      { message: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const {
    requester_id,
    min_availability_hours,
    limit = 10,
  } = body as Record<string, unknown>;

  // requester_id is required (Req 10.1)
  if (!requester_id || typeof requester_id !== "string") {
    return Response.json(
      { message: "requester_id is required and must be a string" },
      { status: 400 }
    );
  }

  // limit must be an integer in [1, 50] (Req 10.4)
  if (
    limit !== undefined &&
    (!Number.isInteger(limit) ||
      (limit as number) < 1 ||
      (limit as number) > 50)
  ) {
    return Response.json(
      { message: "limit must be an integer between 1 and 50" },
      { status: 400 }
    );
  }

  // min_availability_hours must be a non-negative integer when provided
  if (
    min_availability_hours !== undefined &&
    (!Number.isInteger(min_availability_hours) ||
      (min_availability_hours as number) < 0)
  ) {
    return Response.json(
      { message: "min_availability_hours must be a non-negative integer" },
      { status: 400 }
    );
  }

  // ── Step 3: Run the Match Engine ────────────────────────────────────────────
  try {
    const result = await runMatchEngine(supabase, {
      requester_id: requester_id as string,
      min_availability_hours:
        min_availability_hours !== undefined
          ? (min_availability_hours as number)
          : undefined,
      limit: limit as number,
    });

    return Response.json(result, { status: 200 });
  } catch (err) {
    // Map typed errors to their corresponding HTTP status codes.
    // Internal details (stack traces, DB errors) are never exposed (Req 10.5).

    if (err instanceof NotFoundError) {
      return Response.json({ message: err.message }, { status: 404 });
    }

    if (err instanceof ValidationError) {
      return Response.json({ message: err.message }, { status: 400 });
    }

    if (err instanceof ConfigError) {
      // Config errors indicate a server-side misconfiguration
      return Response.json({ message: "Internal server error" }, { status: 500 });
    }

    // Catch-all: unexpected errors — log server-side, return generic message
    console.error("[POST /api/match] Unexpected error:", err);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
