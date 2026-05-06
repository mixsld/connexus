"use client";

/**
 * MatchCard — card displaying a single ranked match result.
 *
 * Redesigned with violet (#7C3AED) accent, cleaner layout,
 * and a prominent "Why we match?" AI explanation panel.
 *
 * WCAG 2.1 AA: semantic HTML, aria-labels, focus rings, min 44px targets.
 * Tailwind v4, dark mode via .dark class.
 */

import { useState, useEffect } from "react";
import type { RankedResult } from "@/lib/match-engine/types";
import { createClient } from "@/lib/supabase/client";
import ScoreRing from "./ScoreRing";

export interface MatchCardProps {
  result: RankedResult;
  index: number;
  currentProfileId?: string;
  initialInterested?: boolean;
  compact?: boolean;
}

// ── Chip ──────────────────────────────────────────────────────────────────────

function Chip({ label, variant }: { label: string; variant: "skill" | "interest" }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-none";
  const styles =
    variant === "skill"
      ? "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300"
      : "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300";
  return <span className={`${base} ${styles}`}>{label}</span>;
}

// ── Score breakdown bars ──────────────────────────────────────────────────────

function ScoreBreakdownBar({ breakdown }: { breakdown: RankedResult["score_breakdown"] }) {
  const dims: { key: keyof typeof breakdown; label: string }[] = [
    { key: "course_score", label: "Course" },
    { key: "skills_score", label: "Skills" },
    { key: "interests_score", label: "Interests" },
    { key: "project_needs_score", label: "Project" },
  ];

  return (
    <div className="space-y-1.5" role="group" aria-label="Score breakdown by dimension">
      {dims.map(({ key, label }) => {
        const pct = Math.round(breakdown[key] * 100);
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-right text-[11px] text-gray-400 dark:text-gray-500">
              {label}
            </span>
            <div
              className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${label} score: ${pct}%`}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: "#7C3AED" }}
              />
            </div>
            <span className="w-8 shrink-0 text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── AI explanation panel ──────────────────────────────────────────────────────

interface ExplanationPanelProps {
  candidateId: string;
  currentProfileId: string;
  result: RankedResult;
}

function ExplanationPanel({ candidateId, currentProfileId, result }: ExplanationPanelProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);


  // Choose button label based on score
  const buttonLabel =
    result.score >= 50
      ? "Why we match"
      : result.score >= 20
        ? "How could we collaborate?"
        : "Suggest a project idea";

  async function fetchExplanation() {
    if (explanation || loading) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("full_name, college, program, year_level, skill_tags, interest_tags, project_needs, availability_hours_per_week")
      .eq("id", currentProfileId)
      .single();

    if (!myProfile) {
      setError("Could not load your profile.");
      setLoading(false);
      return;
    }

    const requester_profile = {
      full_name: myProfile.full_name,
      college: myProfile.college,
      program: myProfile.program,
      year_level: myProfile.year_level,
      skill_tags: myProfile.skill_tags ?? [],
      interest_tags: myProfile.interest_tags ?? [],
      project_needs: myProfile.project_needs ?? [],
      availability_hours_per_week: myProfile.availability_hours_per_week,
    };

    const candidate_profile = {
      full_name: result.full_name,
      college: result.college,
      program: result.program,
      year_level: result.year_level,
      skill_tags: result.skill_tags,
      interest_tags: result.interest_tags,
      project_needs: [],
      availability_hours_per_week: result.availability_hours_per_week,
    };

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-match-explanation`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ requester_profile, candidate_profile }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate explanation");
      setExplanation(data.explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    if (!open) fetchExplanation();
    setOpen((v) => !v);
  }

  return (
    <div>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls={`explanation-${candidateId}`}
        className={[
          "flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5",
          "border text-sm font-medium transition-all duration-150",
          open
            ? "border-violet-300 bg-violet-600 text-white dark:border-violet-600 dark:bg-violet-700"
            : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-800/50 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/40",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
        ].join(" ")}
      >
        <span className="flex items-center gap-2">
          {/* Sparkle icon */}
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
          </svg>
          {buttonLabel}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Explanation panel */}
      {open && (
        <div
          id={`explanation-${candidateId}`}
          className="mt-2 animate-slide-down rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-800/40 dark:bg-violet-900/20"
          role="region"
          aria-label={`AI match explanation for ${result.full_name}`}
          aria-live="polite"
        >
          {loading && (
            <div className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Generating explanation…
            </div>
          )}

          {error && !loading && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
          )}

          {explanation && !loading && (
            <p className="text-sm leading-relaxed text-violet-900 dark:text-violet-200">
              {explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── MatchCard ─────────────────────────────────────────────────────────────────

export default function MatchCard({
  result,
  index,
  currentProfileId,
  initialInterested = false,
  compact = false,
}: MatchCardProps) {
  const {
    candidate_id,
    full_name,
    college,
    program,
    year_level,
    skill_tags,
    interest_tags,
    availability_hours_per_week,
    score,
    score_breakdown,
  } = result;

  const animationDelay = `${index * 60}ms`;

  const [interested, setInterested] = useState(initialInterested);
  const [interestLoading, setInterestLoading] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);

  // Check existing interest on mount
  useEffect(() => {
    if (!currentProfileId) return;
    const supabase = createClient();
    supabase
      .from("matches")
      .select("id")
      .eq("sender_id", currentProfileId)
      .eq("receiver_id", candidate_id)
      .eq("status", "interested")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) setInterested(true);
      });
  }, [currentProfileId, candidate_id]);

  async function handleInterested() {
    if (!currentProfileId || interested) return;
    setInterestLoading(true);
    setInterestError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("matches")
      .upsert(
        { sender_id: currentProfileId, receiver_id: candidate_id, status: "interested" },
        { onConflict: "sender_id,receiver_id" }
      );

    if (insertError) {
      setInterestError("Could not send interest. Please try again.");
      setInterestLoading(false);
      return;
    }

    // Check for mutual match → create conversation
    const { data: mutual } = await supabase
      .from("matches")
      .select("id")
      .eq("sender_id", candidate_id)
      .eq("receiver_id", currentProfileId)
      .eq("status", "interested")
      .maybeSingle();

    if (mutual) {
      const [a, b] = [currentProfileId, candidate_id].sort();
      await supabase
        .from("conversations")
        .upsert({ profile_a_id: a, profile_b_id: b }, { onConflict: "profile_a_id,profile_b_id" });
    }

    setInterested(true);
    setInterestLoading(false);
  }

  return (
    <article
      className={[
        "group relative flex flex-col gap-4 rounded-2xl p-5",
        "bg-white dark:bg-gray-900",
        "border border-gray-200 dark:border-gray-700/60",
        "shadow-xs hover:shadow-lg hover:-translate-y-0.5",
        "transition-all duration-200 ease-out",
        "animate-card-enter",
      ].join(" ")}
      style={{ animationDelay, animationFillMode: "both" }}
      aria-label={`Match: ${full_name}, compatibility score ${score} out of 100`}
    >
      {/* ── Top row: score ring + identity ─────────────────────────────── */}
      <div className="flex items-start gap-4">
        <ScoreRing score={score} size={72} strokeWidth={6} animate />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-gray-900 dark:text-gray-50">
            {full_name}
          </h3>
          <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-400">{program}</p>
          <p className="truncate text-xs text-gray-400 dark:text-gray-500">{college}</p>
        </div>
      </div>

      {/* ── Score breakdown ─────────────────────────────────────────────── */}
      {!compact && <ScoreBreakdownBar breakdown={score_breakdown} />}

      {/* ── Skill tags ──────────────────────────────────────────────────── */}
      {!compact && skill_tags.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Skills
          </p>
          <ul className="flex flex-wrap gap-1.5" aria-label={`Skills: ${skill_tags.join(", ")}`}>
            {skill_tags.map((tag) => (
              <li key={tag}><Chip label={tag} variant="skill" /></li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Interest tags ────────────────────────────────────────────────── */}
      {!compact && interest_tags.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Interests
          </p>
          <ul className="flex flex-wrap gap-1.5" aria-label={`Interests: ${interest_tags.join(", ")}`}>
            {interest_tags.map((tag) => (
              <li key={tag}><Chip label={tag} variant="interest" /></li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="mt-auto space-y-3 border-t border-gray-100 pt-3 dark:border-gray-800">
        {/* Meta row */}
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            aria-label={`Available ${availability_hours_per_week} hours per week`}
          >
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11ZM7.25 4v4.31l2.97 1.71-.75 1.3L6 9.44V4h1.25Z" />
            </svg>
            {availability_hours_per_week} hrs/wk
          </span>
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
            Year {year_level}
          </span>
        </div>

        {/* Interested button */}
        {currentProfileId && (
          <div>
            <button
              type="button"
              onClick={handleInterested}
              disabled={interested || interestLoading}
              aria-pressed={interested}
              aria-label={
                interested
                  ? `Interest sent to ${full_name}`
                  : `Express interest in collaborating with ${full_name}`
              }
              className={[
                "flex w-full min-h-[40px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
                "transition-all duration-150",
                interested
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 cursor-default"
                  : interestLoading
                    ? "cursor-not-allowed opacity-60 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                    : "bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800 shadow-xs shadow-violet-200 dark:shadow-violet-900/30",
              ].join(" ")}
            >
              {interestLoading ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Sending…
                </>
              ) : interested ? (
                <>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  Interest sent
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-2.184C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 7.5c0 2.852-2.044 5.233-3.885 6.936a22.049 22.049 0 0 1-3.744 2.866l-.019.01-.005.003h-.002a.739.739 0 0 1-.69.001l-.002-.001Z" />
                  </svg>
                  Interested
                </>
              )}
            </button>
            {interestError && (
              <p role="alert" className="mt-1 text-center text-xs text-red-600 dark:text-red-400">
                {interestError}
              </p>
            )}
          </div>
        )}

        {/* AI explanation */}
        {currentProfileId && (
          <ExplanationPanel
            candidateId={candidate_id}
            currentProfileId={currentProfileId}
            result={result}
          />
        )}
      </footer>
    </article>
  );
}