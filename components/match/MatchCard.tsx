"use client";

import { useState, useEffect } from "react";  // ← add useEffect
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

interface ChipProps {
  label: string;
  variant: "skill" | "interest";
}

function Chip({ label, variant }: ChipProps) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-none";
  const styles =
    variant === "skill"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300";

  return <span className={`${base} ${styles}`}>{label}</span>;
}

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

  // ── Check for an existing interest whenever IDs are known ─────────────
    // ── Check if current user already expressed interest ───────────────────
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
        if (!error && data) {
          setInterested(true);
        }
      });
  }, [currentProfileId, candidate_id]);

  // ── Express interest or withdraw ───────────────────────────────────────
  async function handleInterested() {
    if (!currentProfileId || interested) return;
    setInterestLoading(true);
    setInterestError(null);

    const supabase = createClient();

    // Insert the directed interest (sender → receiver)
    const { error: insertError } = await supabase
      .from("matches")
      .upsert(
        {
          sender_id: currentProfileId,
          receiver_id: candidate_id,
          status: "interested",
        },
        { onConflict: "sender_id,receiver_id" }
      );

    if (insertError) {
      setInterestError("Could not send interest. Please try again.");
      setInterestLoading(false);
      return;
    }

    // Check if the other side has also expressed interest → mutual match
    const { data: mutual } = await supabase
      .from("matches")
      .select("id")
      .eq("sender_id", candidate_id)
      .eq("receiver_id", currentProfileId)
      .eq("status", "interested")
      .maybeSingle();

    if (mutual) {
      // Create a conversation with canonical profile ordering
      const [a, b] = [currentProfileId, candidate_id].sort();
      await supabase
        .from("conversations")
        .upsert(
          { profile_a_id: a, profile_b_id: b },
          { onConflict: "profile_a_id,profile_b_id" }
        );
    }

    setInterested(true);
    setInterestLoading(false);
  }

const [explanation, setExplanation] = useState<string | null>(null);
const [explanationLoading, setExplanationLoading] = useState(false);

  return (
    <article
      className={[
        "flex flex-col gap-4 rounded-2xl p-5",
        "bg-white dark:bg-gray-900",
        "border border-gray-200 dark:border-gray-700",
        "shadow-sm hover:shadow-md",
        "transition-all duration-200 ease-out",
        "animate-card-enter",
      ].join(" ")}
      style={{ animationDelay, animationFillMode: "both" }}
      aria-label={`Match: ${full_name}, compatibility score ${score} out of 100`}
    >
      <div className="flex items-start gap-4">
        <ScoreRing score={score} size={72} strokeWidth={6} animate />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-gray-900 dark:text-gray-50">
            {full_name}
          </h3>
          <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-400">
            {program}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-500">
            {college}
          </p>
        </div>
      </div>

      {!compact && <ScoreBreakdownBar breakdown={score_breakdown} />}

      {!compact && skill_tags.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Skills
          </p>
          <ul className="flex flex-wrap gap-1.5" aria-label={`Skills: ${skill_tags.join(", ")}`}>
            {skill_tags.map((tag) => (
              <li key={tag}>
                <Chip label={tag} variant="skill" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && interest_tags.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Interests
          </p>
          <ul className="flex flex-wrap gap-1.5" aria-label={`Interests: ${interest_tags.join(", ")}`}>
            {interest_tags.map((tag) => (
              <li key={tag}>
                <Chip label={tag} variant="interest" />
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer className="mt-auto space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            aria-label={`Available ${availability_hours_per_week} hours per week`}
          >
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11ZM7.25 4v4.31l2.97 1.71-.75 1.3L6 9.44V4h1.25Z" />
            </svg>
            {availability_hours_per_week} hrs/wk
          </span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400" aria-label={`Year ${year_level}`}>
            Year {year_level}
          </span>
        </div>

        {currentProfileId && (
          <div>
            <button
              type="button"
              onClick={handleInterested}
              disabled={interested || interestLoading || !currentProfileId}
              aria-pressed={interested}
              aria-label={
                interested
                  ? `Interest sent to ${full_name}`
                  : `Express interest in collaborating with ${full_name}`
              }
              className={[
                "flex w-full min-h-[36px] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500",
                "transition-all duration-150",
                interested
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-default"
                  : interestLoading
                    ? "opacity-60 cursor-not-allowed bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50",
              ].join(" ")}
            >
              {interestLoading ? (
                <>
                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Sending…
                </>
              ) : interested ? (
                <>
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  Interest sent
                </>
              ) : (
                <>
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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

        <button
  type="button"
  onClick={async () => {
    if (!explanation) {
      setExplanationLoading(true);
      // Get current user's profile data (you'll need to pass it or access from context)
      // For now, hardcode your test profile:
      const supabase = createClient();
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentProfileId)
        .single();

      if (!myProfile) return;

      const requester_profile = {
        full_name: myProfile.full_name,
        college: myProfile.college,
        program: myProfile.program,
        year_level: myProfile.year_level,
        skill_tags: myProfile.skill_tags,
        interest_tags: myProfile.interest_tags,
        project_needs: myProfile.project_needs || [],
        availability_hours_per_week: myProfile.availability_hours_per_week,
      };
      const candidate_profile = {
        full_name,
        college,
        program,
        year_level,
        skill_tags,
        interest_tags,
        project_needs: [], // you may not have this, send empty
        availability_hours_per_week,
      };
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
      setExplanation(data.explanation);
      setExplanationLoading(false);
    }
  }}
  disabled={explanationLoading}
  className="text-xs text-amber-600 hover:text-amber-700 font-medium"
>
  {explanationLoading ? "Loading..." : explanation ? "Why?" : "Why we match?"}
</button>
      </footer>

      {explanation && (
  <p className="mt-3 text-xs italic text-gray-600 dark:text-gray-400 border-t border-gray-100 pt-3">
    💡 {explanation}
  </p>
)}
    </article>
  );
}

interface ScoreBreakdownBarProps {
  breakdown: RankedResult["score_breakdown"];
}

function ScoreBreakdownBar({ breakdown }: ScoreBreakdownBarProps) {
  const dimensions: { key: keyof typeof breakdown; label: string }[] = [
    { key: "course_score", label: "Course" },
    { key: "skills_score", label: "Skills" },
    { key: "interests_score", label: "Interests" },
    { key: "project_needs_score", label: "Project" },
  ];

  return (
    <div className="space-y-1.5" aria-label="Score breakdown by dimension" role="group">
      {dimensions.map(({ key, label }) => {
        const pct = Math.round(breakdown[key] * 100);
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-right text-xs text-gray-400 dark:text-gray-500">
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
                style={{ width: `${pct}%`, backgroundColor: "#F5A623" }}
              />
            </div>
            <span className="w-8 shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}