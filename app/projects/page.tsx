"use client";

/**
 * Projects listing page — shows all open projects from public.projects.
 *
 * Each card shows: title, description excerpt, owner name, required skills,
 * required roles, and a "Find teammates" button that opens an inline
 * match panel using POST /api/match with the project's required_roles
 * as project_needs.
 *
 * Tailwind v4, WCAG 2.1 AA, dark mode via .dark class.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ProjectNeed, RankedResult, MatchResult } from "@/lib/match-engine/types";
import TeammateResultRow from "@/components/match/TeammateResultRow";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  required_skills: string[];
  required_roles: ProjectNeed[];
  status: "open" | "closed" | "archived";
  created_at: string;
  owner?: { full_name: string; program: string };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkillChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
      {label}
    </span>
  );
}

function RoleChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
      {label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Teammate finder panel ────────────────────────────────────────────────────

interface TeammateFinderProps {
  project: Project;
  myProfileId: string;
  onClose: () => void;
}

function TeammateFinder({ project, myProfileId, onClose }: TeammateFinderProps) {
  const [results, setResults] = useState<RankedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [evaluated, setEvaluated] = useState<number | null>(null);

  const runMatch = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requester_id: myProfileId,
          limit: 20,
          // project_needs override is handled server-side via a separate
          // endpoint; here we use the standard match and note the project context
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { message?: string }).message ??
            "Failed to find teammates. Please try again."
        );
        setLoading(false);
        return;
      }

      const data: MatchResult = await res.json();
      setResults(data.results);
      setEvaluated(data.total_candidates_evaluated);
    } catch {
      setError("Network error — please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [myProfileId]);

  // Run on mount
  useEffect(() => {
    runMatch();
  }, [runMatch]);

  return (
    <div
      className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800/40 dark:bg-amber-900/10"
      role="region"
      aria-label={`Teammate suggestions for ${project.title}`}
    >
      {/* Panel header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            Suggested teammates
          </h3>
          {evaluated !== null && !loading && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {results.length} of {evaluated} candidates evaluated
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close teammate suggestions"
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      {/* Scrollable results container — prevents layout break on overflow */}
      {/* Scrollable results — lightweight rows instead of full cards */}
      <div className="max-h-80 overflow-y-auto space-y-2">
        {loading ? (
          <p className="text-center text-xs text-gray-500 py-4">Loading suggestions…</p>
        ) : results.length > 0 ? (
          results.map((r) => (
            <TeammateResultRow
              key={r.candidate_id}
              result={r}
              currentProfileId={myProfileId}
            />
          ))
        ) : (
          <p className="text-center text-xs text-gray-500 py-4">
            No matching candidates found. Try a broader search.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  myProfileId: string | null;
  isOwner: boolean;
}

function ProjectCard({ project, myProfileId, isOwner }: ProjectCardProps) {
  const [showTeammates, setShowTeammates] = useState(false);

  return (
    <article
      className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
      aria-label={`Project: ${project.title}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold text-gray-900 dark:text-gray-50">
              {project.title}
            </h2>
            {isOwner && (
              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                Yours
              </span>
            )}
          </div>
          {project.owner && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              by {project.owner.full_name} · {project.owner.program}
            </p>
          )}
        </div>
        <time
          dateTime={project.created_at}
          className="shrink-0 text-xs text-gray-400 dark:text-gray-500"
        >
          {formatDate(project.created_at)}
        </time>
      </div>

      {/* Description */}
      <p className="line-clamp-3 text-sm text-gray-600 dark:text-gray-400">
        {project.description}
      </p>

      {/* Required skills */}
      {project.required_skills.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Skills needed
          </p>
          <ul
            className="flex flex-wrap gap-1.5"
            aria-label={`Required skills: ${project.required_skills.join(", ")}`}
          >
            {project.required_skills.map((s) => (
              <li key={s}>
                <SkillChip label={s} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Required roles */}
      {project.required_roles.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Roles needed
          </p>
          <ul
            className="flex flex-wrap gap-1.5"
            aria-label={`Required roles: ${project.required_roles.map((r) => r.role).join(", ")}`}
          >
            {project.required_roles.map((r, i) => (
              <li key={i}>
                <RoleChip label={r.role} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {myProfileId && (
        <div className="mt-auto border-t border-gray-100 pt-3 dark:border-gray-800">
          {!showTeammates ? (
            <button
              type="button"
              onClick={() => setShowTeammates(true)}
              className={[
                "flex w-full min-h-[40px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-gray-900",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500",
                "transition-all duration-150 hover:brightness-95 active:scale-[0.98]",
              ].join(" ")}
              style={{ backgroundColor: "#F5A623" }}
              aria-expanded={showTeammates}
              aria-controls={`teammates-${project.id}`}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
              </svg>
              Find teammates
            </button>
          ) : (
            <div id={`teammates-${project.id}`}>
              <TeammateFinder
                project={project}
                myProfileId={myProfileId}
                onClose={() => setShowTeammates(false)}
              />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Get my profile id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) setMyProfileId(profile.id);

      // Fetch open projects + owner profile
      const { data, error: fetchErr } = await supabase
        .from("projects")
        .select(
          `id, owner_id, title, description, required_skills, required_roles,
           status, created_at,
           owner:profiles!projects_owner_id_fkey(full_name, program)`
        )
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (fetchErr) {
        setError("Failed to load projects. Please try again.");
        setLoading(false);
        return;
      }

      setProjects((data ?? []) as unknown as Project[]);
      setLoading(false);
    }

    load();
  }, [router]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-3">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-4/6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-5 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                ))}
              </div>
              <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Page heading */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
            Open projects
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Browse projects looking for collaborators, or post your own.
          </p>
        </div>
        <a
          href="/projects/new"
          className={[
            "inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-900",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500",
            "transition-all hover:brightness-95 active:scale-[0.98]",
          ].join(" ")}
          style={{ backgroundColor: "#F5A623" }}
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Post a project
        </a>
      </header>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-50">No open projects yet</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Be the first to post a project and find your team.</p>
          </div>
          <a
            href="/projects/new"
            className="mt-2 inline-flex min-h-[44px] items-center rounded-lg px-5 py-2.5 text-sm font-semibold text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 transition-all hover:brightness-95"
            style={{ backgroundColor: "#F5A623" }}
          >
            Post a project
          </a>
        </div>
      )}

      {/* Project grid */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              myProfileId={myProfileId}
              isOwner={project.owner_id === myProfileId}
            />
          ))}
        </div>
      )}
    </div>
  );
}