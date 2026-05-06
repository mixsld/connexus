"use client";

/**
 * New project form — create a project in public.projects.
 *
 * Fields:
 *   - title (text, 3–120 chars)
 *   - description (textarea, 10–2000 chars)
 *   - required_skills (tag input, normalised to lowercase)
 *   - required_roles (dynamic list: role name + required skills per role)
 *
 * On submit: inserts into public.projects, redirects to /projects.
 * Tailwind v4, WCAG 2.1 AA, dark mode via .dark class.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ProjectNeed } from "@/lib/match-engine/types";

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputBase =
  "w-full rounded-lg border px-3 py-2.5 text-sm bg-white text-gray-900 " +
  "placeholder:text-gray-400 dark:bg-gray-800 dark:text-gray-100 " +
  "dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 " +
  "focus:ring-offset-0 transition-colors duration-150";

const inputNormal =
  inputBase +
  " border-gray-300 dark:border-gray-600 focus:border-violet-400 " +
  "focus:ring-violet-400/30 dark:focus:border-violet-500 dark:focus:ring-violet-500/30";

const inputErr =
  inputBase +
  " border-red-400 dark:border-red-500 focus:border-red-500 " +
  "focus:ring-red-400/30 dark:focus:border-red-400 dark:focus:ring-red-400/30";

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({
  id,
  tags,
  onChange,
  placeholder,
}: {
  id: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  function add(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div
      className={
        "flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-lg border " +
        "border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 " +
        "focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-400/30 " +
        "dark:focus-within:border-violet-500 dark:focus-within:ring-violet-500/30 " +
        "cursor-text transition-colors duration-150"
      }
      onClick={() => ref.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-300"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(tags.filter((t) => t !== tag));
            }}
            aria-label={`Remove ${tag}`}
            className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-500"
          >
            <svg className="h-2.5 w-2.5" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5l2.36-2.36a.9.9 0 1 0-1.28-1.28L5 3.72 2.64 1.36a.9.9 0 0 0-1.28 1.28L3.72 5 1.36 7.36a.9.9 0 1 0 1.28 1.28L5 6.28l2.36 2.36a.9.9 0 0 0 1.28-1.28L6.28 5Z" />
            </svg>
          </button>
        </span>
      ))}
      <input
        ref={ref}
        id={id}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) add(input); }}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="min-w-[120px] flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
        aria-label={placeholder}
      />
    </div>
  );
}

// ─── Required roles editor ────────────────────────────────────────────────────

function RolesEditor({
  roles,
  onChange,
  errors,
}: {
  roles: ProjectNeed[];
  onChange: (roles: ProjectNeed[]) => void;
  errors: Record<string, string>;
}) {
  function add() {
    onChange([...roles, { role: "", required_skills: [] }]);
  }

  function remove(i: number) {
    onChange(roles.filter((_, idx) => idx !== i));
  }

  function updateRole(i: number, role: string) {
    onChange(roles.map((r, idx) => (idx === i ? { ...r, role } : r)));
  }

  function updateSkills(i: number, required_skills: string[]) {
    onChange(roles.map((r, idx) => (idx === i ? { ...r, required_skills } : r)));
  }

  return (
    <div className="space-y-3">
      {roles.map((role, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Role #{i + 1}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove role ${i + 1}`}
              className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-500 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor={`role-name-${i}`}
                className="text-xs font-medium text-gray-600 dark:text-gray-400"
              >
                Role name <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id={`role-name-${i}`}
                type="text"
                required
                placeholder="e.g. backend-developer"
                value={role.role}
                onChange={(e) => updateRole(i, e.target.value)}
                aria-describedby={errors[`role_${i}`] ? `err-role-${i}` : undefined}
                aria-invalid={!!errors[`role_${i}`]}
                className={errors[`role_${i}`] ? inputErr : inputNormal}
              />
              {errors[`role_${i}`] && (
                <p id={`err-role-${i}`} role="alert" className="text-xs text-red-600 dark:text-red-400">
                  {errors[`role_${i}`]}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor={`role-skills-${i}`}
                className="text-xs font-medium text-gray-600 dark:text-gray-400"
              >
                Required skills for this role
              </label>
              <TagInput
                id={`role-skills-${i}`}
                tags={role.required_skills}
                onChange={(skills) => updateSkills(i, skills)}
                placeholder="Type a skill and press Enter"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className={
          "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed " +
          "border-gray-300 py-3 text-sm font-medium text-gray-500 " +
          "hover:border-violet-400 hover:text-violet-600 " +
          "dark:border-gray-600 dark:text-gray-400 dark:hover:border-violet-500 dark:hover:text-violet-400 " +
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 " +
          "transition-colors duration-150"
        }
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        Add a role
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  description: string;
  required_skills: string[];
  required_roles: ProjectNeed[];
}

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    required_skills: [],
    required_roles: [],
  });
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Auth + profile check on mount
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { router.push("/profile"); return; }
      setMyProfileId(profile.id);
    }
    init();
  }, [router]);

  // Validation
  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (form.title.trim().length < 3)
      errors.title = "Title must be at least 3 characters.";
    if (form.title.trim().length > 120)
      errors.title = "Title must be 120 characters or fewer.";
    if (form.description.trim().length < 10)
      errors.description = "Description must be at least 10 characters.";
    if (form.description.trim().length > 2000)
      errors.description = "Description must be 2000 characters or fewer.";

    form.required_roles.forEach((r, i) => {
      if (!r.role.trim()) errors[`role_${i}`] = `Role #${i + 1} needs a name.`;
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setGlobalError(null);
      if (!validate() || !myProfileId) return;

      setSaving(true);

      const normalisedRoles: ProjectNeed[] = form.required_roles.map((r) => ({
        role: r.role.trim().toLowerCase(),
        required_skills: r.required_skills.map((s) => s.trim().toLowerCase()),
      }));

      const supabase = createClient();
      const { error } = await supabase.from("projects").insert({
        owner_id: myProfileId,
        title: form.title.trim(),
        description: form.description.trim(),
        required_skills: form.required_skills.map((s) => s.trim().toLowerCase()),
        required_roles: normalisedRoles,
        status: "open",
      });

      if (error) {
        setGlobalError("Failed to create project. Please try again.");
        setSaving(false);
        return;
      }

      router.push("/projects");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, myProfileId, router]
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          Post a project
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Describe what you&apos;re building and the teammates you need.
        </p>
      </header>

      {globalError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300"
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <span>{globalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate aria-label="New project form" className="space-y-8">
        {/* ── Basic info ──────────────────────────────────────────────────── */}
        <section
          aria-labelledby="section-basic"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <h2 id="section-basic" className="text-base font-semibold text-gray-900 dark:text-gray-50">
            Project details
          </h2>

          <div className="mt-5 space-y-5">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Title <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                required
                maxLength={120}
                placeholder="e.g. UST Campus Event App"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                aria-describedby={fieldErrors.title ? "err-title" : undefined}
                aria-invalid={!!fieldErrors.title}
                className={fieldErrors.title ? inputErr : inputNormal}
              />
              <div className="flex items-start justify-between gap-2">
                {fieldErrors.title ? (
                  <p id="err-title" role="alert" className="text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.title}
                  </p>
                ) : <span />}
                <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                  {form.title.length}/120
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Description <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                required
                rows={5}
                maxLength={2000}
                placeholder="What are you building? What's the goal? What stage are you at?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                aria-describedby={fieldErrors.description ? "err-description" : undefined}
                aria-invalid={!!fieldErrors.description}
                className={
                  (fieldErrors.description ? inputErr : inputNormal) +
                  " resize-y min-h-[120px]"
                }
              />
              <div className="flex items-start justify-between gap-2">
                {fieldErrors.description ? (
                  <p id="err-description" role="alert" className="text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.description}
                  </p>
                ) : <span />}
                <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                  {form.description.length}/2000
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Skills ─────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="section-skills"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <h2 id="section-skills" className="text-base font-semibold text-gray-900 dark:text-gray-50">
            Required skills
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Skills the project needs overall. Press{" "}
            <kbd className="rounded border border-gray-300 px-1 py-0.5 text-xs dark:border-gray-600">Enter</kbd>{" "}
            or{" "}
            <kbd className="rounded border border-gray-300 px-1 py-0.5 text-xs dark:border-gray-600">,</kbd>{" "}
            to add.
          </p>
          <div className="mt-4">
            <label htmlFor="required-skills" className="sr-only">Required skills</label>
            <TagInput
              id="required-skills"
              tags={form.required_skills}
              onChange={(tags) => setForm((f) => ({ ...f, required_skills: tags }))}
              placeholder="Add a skill…"
            />
          </div>
        </section>

        {/* ── Roles ──────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="section-roles"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <h2 id="section-roles" className="text-base font-semibold text-gray-900 dark:text-gray-50">
            Required roles
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Specific roles you need filled. Each role can have its own required skills.
          </p>
          <div className="mt-4">
            <RolesEditor
              roles={form.required_roles}
              onChange={(roles) => setForm((f) => ({ ...f, required_roles: roles }))}
              errors={fieldErrors}
            />
          </div>
        </section>

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <a
            href="/projects"
            className={
              "inline-flex min-h-[44px] items-center justify-center rounded-lg px-5 py-2.5 " +
              "text-sm font-medium text-gray-700 dark:text-gray-300 " +
              "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 " +
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 " +
              "transition-colors duration-150"
            }
          >
            Cancel
          </a>

          <button
            type="submit"
            disabled={saving || !myProfileId}
            aria-busy={saving}
            className={[
              "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-6 py-2.5",
              "text-sm font-semibold text-white",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
              "transition-all duration-150",
              saving || !myProfileId
                ? "cursor-not-allowed opacity-60"
                : "hover:brightness-95 active:scale-[0.98]",
            ].join(" ")}
            style={{ backgroundColor: "#7C3AED" }}
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Posting…
              </>
            ) : (
              "Post project"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
