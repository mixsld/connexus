/**
 * app/match/page.tsx — Match page Server Component.
 *
 * Validates session, fetches the requester's profile, and renders
 * the interactive MatchForm client component.
 */

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import MatchForm from "@/components/match/MatchForm";
import type { Profile } from "@/lib/match-engine/types";

export default async function MatchPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single<Profile>();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <header className="mb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {/* Eyebrow */}
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
              Connexus · Match
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">
              Find your collaborator
            </h1>
            <p className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
              Ranked by course alignment, shared skills, common interests, and
              project needs — all in one score.
            </p>
          </div>

          <a
            href="/profile"
            className={[
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
              "bg-violet-100 text-violet-700",
              "hover:bg-violet-100 dark:border-violet-800/50 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/40",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
              "transition-colors duration-150",
            ].join(" ")}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="m2.695 14.763-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
            </svg>
            Edit profile
          </a>
        </div>

      </header>

      {/* Profile incomplete warning */}
      {(error || !profile) && (
        <div
          role="alert"
          className="mb-8 flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 text-sm text-violet-800 dark:border-violet-800/40 dark:bg-violet-900/20 dark:text-violet-300"
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <span>
            Your profile is incomplete or inactive.{" "}
            <a
              href="/profile"
              className="font-semibold underline underline-offset-2 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
            >
              Complete your profile
            </a>{" "}
            to start matching.
          </span>
        </div>
      )}

      {profile && <MatchForm requesterId={profile.id} />}
    </div>
  );
}
