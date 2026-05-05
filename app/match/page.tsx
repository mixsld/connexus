import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import MatchForm from "@/components/match/MatchForm";
import type { Profile } from "@/lib/match-engine/types";

export default async function MatchPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single<Profile>();

  // ── Profile incomplete state ───────────────────────────────────────────
  if (error || !profile) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          {/* Subtle icon — inspired by Linear's empty states */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D4A853]/10 ring-1 ring-inset ring-[#D4A853]/20">
            <svg
              className="h-7 w-7 text-[#D4A853]"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5ZM10 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Complete your profile
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Tell us about your skills, interests, and the kind of project
            you want to build. The better your profile, the smarter the
            matches.
          </p>
          <a
            href="/profile"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#D4A853] px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#B8903E] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="m2.695 14.763-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
            </svg>
            Set up profile
          </a>
        </div>
      </div>
    );
  }

  // ── Main match view ────────────────────────────────────────────────────
  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Subtle top gradient bar — inspired by Stripe's page accents */}

      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        {/* Page heading — clean, minimal, no heavy borders */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Discover
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Find collaborators
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Ranked by skills, interests, and cross‑college diversity.
            </p>
          </div>

          {/* Edit profile — subtle secondary action */}
          <a
            href="/profile"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="m2.695 14.763-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
            </svg>
            Edit profile
          </a>
        </div>

        {/* Match form + results */}
        <MatchForm requesterId={profile.id} />
      </div>
    </div>
  );
}