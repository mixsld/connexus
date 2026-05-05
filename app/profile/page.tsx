"use client";

/**
 * Profile page — view and edit the authenticated user's Connexus profile.
 *
 * - Fetches existing profile by user_id on mount (upsert pattern)
 * - Editable fields: full_name, college, program, year_level,
 *   skill_tags, interest_tags, project_needs, availability_hours_per_week
 * - Saves via Supabase upsert to public.profiles
 * - Redirects to /auth/login if unauthenticated
 * - Tailwind v4, WCAG 2.1 AA, dark mode via .dark class strategy
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ProjectNeed } from "@/lib/match-engine/types";

// ─── UST colleges ─────────────────────────────────────────────────────────────

const UST_COLLEGES = [
  "College of Information and Computing Sciences",
  "College of Engineering",
  "College of Architecture and Fine Arts",
  "College of Commerce and Business Administration",
  "College of Education",
  "College of Fine Arts and Design",
  "College of Law",
  "College of Medicine",
  "College of Nursing",
  "College of Pharmacy",
  "College of Rehabilitation Sciences",
  "College of Science",
  "College of Tourism and Hospitality Management",
  "Faculty of Arts and Letters",
  "Faculty of Civil Law",
  "Faculty of Philosophy",
  "Graduate School",
  "Senior High School",
  "Other",
];

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputBase =
  "w-full rounded-lg border px-3 py-2.5 text-sm bg-white text-gray-900 " +
  "placeholder:text-gray-400 dark:bg-gray-800 dark:text-gray-100 " +
  "dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 " +
  "focus:ring-offset-0 transition-colors duration-150";

const inputNormal =
  inputBase +
  " border-gray-300 dark:border-gray-600 focus:border-amber-400 " +
  "focus:ring-amber-400/30 dark:focus:border-amber-500 dark:focus:ring-amber-500/30";

const inputErr =
  inputBase +
  " border-red-400 dark:border-red-500 focus:border-red-500 " +
  "focus:ring-red-400/30 dark:focus:border-red-400 dark:focus:ring-red-400/30";

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {children}
      </label>
      {hint && (
        <span className="text-xs text-gray-400 dark:text-gray-500">{hint}</span>
      )}
    </div>
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
      {children}
    </h2>
  );
}

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({
  id,
  tags,
  onChange,
  placeholder,
  chipColor,
}: {
  id: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  chipColor: "amber" | "indigo";
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  const chipBase =
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium";
  const chipStyles =
    chipColor === "amber"
      ? chipBase +
        " bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      : chipBase +
        " bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300";

  return (
    <div
      className={
        "flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-lg border " +
        "border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 " +
        "focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/30 " +
        "dark:focus-within:border-amber-500 dark:focus-within:ring-amber-500/30 " +
        "transition-colors duration-150 cursor-text"
      }
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span key={tag} className={chipStyles}>
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
            aria-label={`Remove tag ${tag}`}
            className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500"
          >
            <svg className="h-2.5 w-2.5" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5l2.36-2.36a.9.9 0 1 0-1.28-1.28L5 3.72 2.64 1.36a.9.9 0 0 0-1.28 1.28L3.72 5 1.36 7.36a.9.9 0 1 0 1.28 1.28L5 6.28l2.36 2.36a.9.9 0 0 0 1.28-1.28L6.28 5Z" />
            </svg>
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="min-w-[120px] flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
        aria-label={placeholder}
      />
    </div>
  );
}

// ─── Project needs editor ─────────────────────────────────────────────────────

function ProjectNeedsEditor({
  needs,
  onChange,
}: {
  needs: ProjectNeed[];
  onChange: (needs: ProjectNeed[]) => void;
}) {
  function addNeed() {
    onChange([...needs, { role: "", required_skills: [] }]);
  }

  function removeNeed(i: number) {
    onChange(needs.filter((_, idx) => idx !== i));
  }

  function updateRole(i: number, role: string) {
    const next = needs.map((n, idx) => (idx === i ? { ...n, role } : n));
    onChange(next);
  }

  function updateSkills(i: number, required_skills: string[]) {
    const next = needs.map((n, idx) =>
      idx === i ? { ...n, required_skills } : n
    );
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {needs.map((need, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Need #{i + 1}
            </span>
            <button
              type="button"
              onClick={() => removeNeed(i)}
              aria-label={`Remove project need ${i + 1}`}
              className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-500 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {/* Role */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor={`need-role-${i}`}
                className="text-xs font-medium text-gray-600 dark:text-gray-400"
              >
                Role <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id={`need-role-${i}`}
                type="text"
                required
                placeholder="e.g. backend-developer"
                value={need.role}
                onChange={(e) => updateRole(i, e.target.value)}
                className={inputNormal}
              />
            </div>

            {/* Required skills */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor={`need-skills-${i}`}
                className="text-xs font-medium text-gray-600 dark:text-gray-400"
              >
                Required skills
              </label>
              <TagInput
                id={`need-skills-${i}`}
                tags={need.required_skills}
                onChange={(skills) => updateSkills(i, skills)}
                placeholder="Type a skill and press Enter"
                chipColor="amber"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addNeed}
        className={
          "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed " +
          "border-gray-300 py-3 text-sm font-medium text-gray-500 " +
          "hover:border-amber-400 hover:text-amber-600 " +
          "dark:border-gray-600 dark:text-gray-400 dark:hover:border-amber-500 dark:hover:text-amber-400 " +
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 " +
          "transition-colors duration-150"
        }
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        Add project need
      </button>
    </div>
  );
}

// ─── Form state type ──────────────────────────────────────────────────────────

interface FormState {
  full_name: string;
  college: string;
  program: string;
  year_level: string;
  skill_tags: string[];
  interest_tags: string[];
  project_needs: ProjectNeed[];
  availability_hours_per_week: string;
}

const EMPTY_FORM: FormState = {
  full_name: "",
  college: "",
  program: "",
  year_level: "1",
  skill_tags: [],
  interest_tags: [],
  project_needs: [],
  availability_hours_per_week: "0",
};

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Fetch existing profile on mount ────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        setProfileId(profile.id);
        setForm({
          full_name: profile.full_name ?? "",
          college: profile.college ?? "",
          program: profile.program ?? "",
          year_level: String(profile.year_level ?? 1),
          skill_tags: profile.skill_tags ?? [],
          interest_tags: profile.interest_tags ?? [],
          project_needs: profile.project_needs ?? [],
          availability_hours_per_week: String(
            profile.availability_hours_per_week ?? 0
          ),
        });
      } else {
        // Pre-fill full_name from auth metadata if available
        const meta = user.user_metadata as Record<string, unknown> | undefined;
        if (meta?.full_name && typeof meta.full_name === "string") {
          setForm((f) => ({ ...f, full_name: meta.full_name as string }));
        }
      }

      setPageLoading(false);
    }

    load();
  }, [router]);

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!form.full_name.trim()) errors.full_name = "Full name is required.";
    if (!form.college.trim()) errors.college = "College is required.";
    if (!form.program.trim()) errors.program = "Program / degree is required.";

    const yl = parseInt(form.year_level, 10);
    if (isNaN(yl) || yl < 1 || yl > 5)
      errors.year_level = "Year level must be between 1 and 5.";

    const avail = parseInt(form.availability_hours_per_week, 10);
    if (isNaN(avail) || avail < 0)
      errors.availability_hours_per_week =
        "Availability must be 0 or more hours per week.";

    // Validate project needs: each must have a non-empty role
    form.project_needs.forEach((need, i) => {
      if (!need.role.trim()) {
        errors[`need_role_${i}`] = `Project need #${i + 1} requires a role.`;
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setGlobalError(null);
      setSuccessMsg(null);

      if (!validate()) return;
      if (!userId) return;

      setSaving(true);

      // Normalise tags to lowercase
      const normalisedSkills = form.skill_tags.map((t) =>
        t.trim().toLowerCase()
      );
      const normalisedInterests = form.interest_tags.map((t) =>
        t.trim().toLowerCase()
      );
      const normalisedNeeds: ProjectNeed[] = form.project_needs.map((n) => ({
        role: n.role.trim().toLowerCase(),
        required_skills: n.required_skills.map((s) => s.trim().toLowerCase()),
      }));

      const payload = {
        user_id: userId,
        full_name: form.full_name.trim(),
        college: form.college.trim(),
        program: form.program.trim(),
        year_level: parseInt(form.year_level, 10),
        skill_tags: normalisedSkills,
        interest_tags: normalisedInterests,
        project_needs: normalisedNeeds,
        availability_hours_per_week: parseInt(
          form.availability_hours_per_week,
          10
        ),
        is_active: true,
      };

      const supabase = createClient();

      let error;
      if (profileId) {
        // Update existing profile
        ({ error } = await supabase
          .from("profiles")
          .update(payload)
          .eq("id", profileId));
      } else {
        // Insert new profile
        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .insert(payload)
          .select("id")
          .single();
        error = insertError;
        if (inserted) setProfileId(inserted.id);
      }

      if (error) {
        setGlobalError(
          error.message.includes("project_needs")
            ? "Each project need must have a role. Please check your project needs."
            : "Failed to save profile. Please try again."
        );
        setSaving(false);
        return;
      }

      setSuccessMsg("Profile saved successfully.");
      setSaving(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, profileId, userId]
  );

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-8 space-y-3">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* Page heading */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          {profileId ? "Edit profile" : "Complete your profile"}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your profile is used to find the best collaborators for you.
        </p>
      </header>

      {/* Global error */}
      {globalError && (
        <div
          id="profile-error"
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

      {/* Success message */}
      {successMsg && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Edit profile form"
        className="space-y-8"
      >
        {/* ── Section: Basic info ─────────────────────────────────────────── */}
        <section
          aria-labelledby="section-basic"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <SectionHeading>
            <span id="section-basic">Basic information</span>
          </SectionHeading>
          <div className="mt-5 space-y-5">
            {/* Full name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full-name">
                Full name <span aria-hidden="true" className="text-red-500">*</span>
              </Label>
              <input
                id="full-name"
                type="text"
                autoComplete="name"
                required
                placeholder="Maria Santos"
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
                aria-describedby={fieldErrors.full_name ? "err-full-name" : undefined}
                aria-invalid={!!fieldErrors.full_name}
                className={fieldErrors.full_name ? inputErr : inputNormal}
              />
              {fieldErrors.full_name && (
                <FieldError id="err-full-name" message={fieldErrors.full_name} />
              )}
            </div>

            {/* College */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="college">
                College <span aria-hidden="true" className="text-red-500">*</span>
              </Label>
              <select
                id="college"
                required
                value={form.college}
                onChange={(e) =>
                  setForm((f) => ({ ...f, college: e.target.value }))
                }
                aria-describedby={fieldErrors.college ? "err-college" : undefined}
                aria-invalid={!!fieldErrors.college}
                className={fieldErrors.college ? inputErr : inputNormal}
              >
                <option value="">Select your college…</option>
                {UST_COLLEGES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {fieldErrors.college && (
                <FieldError id="err-college" message={fieldErrors.college} />
              )}
            </div>

            {/* Program */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="program">
                Program / degree <span aria-hidden="true" className="text-red-500">*</span>
              </Label>
              <input
                id="program"
                type="text"
                required
                placeholder="e.g. BS Computer Science"
                value={form.program}
                onChange={(e) =>
                  setForm((f) => ({ ...f, program: e.target.value }))
                }
                aria-describedby={fieldErrors.program ? "err-program" : undefined}
                aria-invalid={!!fieldErrors.program}
                className={fieldErrors.program ? inputErr : inputNormal}
              />
              {fieldErrors.program && (
                <FieldError id="err-program" message={fieldErrors.program} />
              )}
            </div>

            {/* Year level + Availability — side by side on sm+ */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Year level */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="year-level">
                  Year level <span aria-hidden="true" className="text-red-500">*</span>
                </Label>
                <select
                  id="year-level"
                  required
                  value={form.year_level}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, year_level: e.target.value }))
                  }
                  aria-describedby={fieldErrors.year_level ? "err-year-level" : undefined}
                  aria-invalid={!!fieldErrors.year_level}
                  className={fieldErrors.year_level ? inputErr : inputNormal}
                >
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={String(y)}>
                      Year {y}
                    </option>
                  ))}
                </select>
                {fieldErrors.year_level && (
                  <FieldError id="err-year-level" message={fieldErrors.year_level} />
                )}
              </div>

              {/* Availability */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="availability" hint="hours per week">
                  Availability <span aria-hidden="true" className="text-red-500">*</span>
                </Label>
                <input
                  id="availability"
                  type="number"
                  min={0}
                  max={168}
                  required
                  placeholder="e.g. 10"
                  value={form.availability_hours_per_week}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      availability_hours_per_week: e.target.value,
                    }))
                  }
                  aria-describedby={
                    fieldErrors.availability_hours_per_week
                      ? "err-availability"
                      : undefined
                  }
                  aria-invalid={!!fieldErrors.availability_hours_per_week}
                  className={
                    fieldErrors.availability_hours_per_week
                      ? inputErr
                      : inputNormal
                  }
                />
                {fieldErrors.availability_hours_per_week && (
                  <FieldError
                    id="err-availability"
                    message={fieldErrors.availability_hours_per_week}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Section: Skills & interests ─────────────────────────────────── */}
        <section
          aria-labelledby="section-skills"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <SectionHeading>
            <span id="section-skills">Skills &amp; interests</span>
          </SectionHeading>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Type a tag and press <kbd className="rounded border border-gray-300 px-1 py-0.5 text-xs dark:border-gray-600">Enter</kbd> or <kbd className="rounded border border-gray-300 px-1 py-0.5 text-xs dark:border-gray-600">,</kbd> to add.
          </p>

          <div className="mt-5 space-y-5">
            {/* Skill tags */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="skill-tags" hint="e.g. react, python, figma">
                Skills
              </Label>
              <TagInput
                id="skill-tags"
                tags={form.skill_tags}
                onChange={(tags) => setForm((f) => ({ ...f, skill_tags: tags }))}
                placeholder="Add a skill…"
                chipColor="amber"
              />
            </div>

            {/* Interest tags */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interest-tags" hint="e.g. machine-learning, ui-design">
                Interests
              </Label>
              <TagInput
                id="interest-tags"
                tags={form.interest_tags}
                onChange={(tags) =>
                  setForm((f) => ({ ...f, interest_tags: tags }))
                }
                placeholder="Add an interest…"
                chipColor="indigo"
              />
            </div>
          </div>
        </section>

        {/* ── Section: Project needs ──────────────────────────────────────── */}
        <section
          aria-labelledby="section-needs"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <SectionHeading>
            <span id="section-needs">Project needs</span>
          </SectionHeading>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Describe the roles and skills you need in a collaborator. Each need
            must have a role name.
          </p>

          {/* Per-need role errors */}
          {Object.entries(fieldErrors)
            .filter(([k]) => k.startsWith("need_role_"))
            .map(([k, msg]) => (
              <p key={k} role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
                {msg}
              </p>
            ))}

          <div className="mt-5">
            <ProjectNeedsEditor
              needs={form.project_needs}
              onChange={(needs) => setForm((f) => ({ ...f, project_needs: needs }))}
            />
          </div>
        </section>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <a
            href="/match"
            className={
              "inline-flex min-h-[44px] items-center justify-center rounded-lg px-5 py-2.5 " +
              "text-sm font-medium text-gray-700 dark:text-gray-300 " +
              "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 " +
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 " +
              "transition-colors duration-150"
            }
          >
            Cancel
          </a>

          <button
            type="submit"
            disabled={saving}
            aria-busy={saving}
            className={[
              "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-6 py-2.5",
              "text-sm font-semibold text-gray-900",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500",
              "transition-all duration-150",
              saving
                ? "cursor-not-allowed opacity-60"
                : "hover:brightness-95 active:scale-[0.98]",
            ].join(" ")}
            style={{ backgroundColor: "#F5A623" }}
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Saving…
              </>
            ) : (
              "Save profile"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
