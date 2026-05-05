"use client";

import { useState } from "react";
import type { RankedResult } from "@/lib/match-engine/types";
import { createClient } from "@/lib/supabase/client";
import ScoreRing from "./ScoreRing";

interface TeammateResultRowProps {
  result: RankedResult;
  currentProfileId: string;
}

export default function TeammateResultRow({
  result,
  currentProfileId,
}: TeammateResultRowProps) {
  const [interested, setInterested] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleInterested() {
    if (interested || loading) return;
    setLoading(true);
    const supabase = createClient();

    const [a, b] = [currentProfileId, result.candidate_id].sort();
    const isCurrentA = a === currentProfileId;

    await supabase.from("matches").upsert(
      {
        user_a_id: a,
        user_b_id: b,
        status_a: isCurrentA ? "interested" : "pending",
        status_b: isCurrentA ? "pending" : "interested",
      },
      { onConflict: "user_a_id,user_b_id" }
    );

    setInterested(true);
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900">
      {/* Score */}
      <ScoreRing score={result.score} size={44} strokeWidth={5} />

      {/* Identity + availability */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">
          {result.full_name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {result.program} · {result.availability_hours_per_week} hrs/wk
        </p>
      </div>

      {/* Interested button */}
      <button
        type="button"
        onClick={handleInterested}
        disabled={interested || loading}
        aria-label={
          interested
            ? `Interest sent to ${result.full_name}`
            : `Express interest in ${result.full_name}`
        }
        className={[
          "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
          interested
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
        ].join(" ")}
      >
        {loading ? "..." : interested ? "Sent" : "Interested"}
      </button>
    </div>
  );
}