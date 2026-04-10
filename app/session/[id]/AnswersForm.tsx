"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { QuestionField, type FieldSource } from "./QuestionField";

// ---------------------------------------------------------------------------
// Field metadata
// ---------------------------------------------------------------------------

type FieldType = "text" | "textarea" | "number";

interface FieldMeta {
  label: string;
  hint?: string;
  type: FieldType;
  rows?: number;
}

const FIELD_META: Record<string, FieldMeta> = {
  // Identity
  full_name:                        { label: "Full name", type: "text" },
  applicant_name:                   { label: "Applicant name", type: "text" },
  referee_name:                     { label: "Referee name", type: "text" },
  referee_title:                    { label: "Referee title / position", type: "text" },
  referee_institution:              { label: "Referee institution", type: "text" },
  relationship_and_duration:        { label: "Relationship & duration", hint: "e.g. Thesis supervisor for 2 years", type: "text" },
  // Targets
  target_university:                { label: "Target university", type: "text" },
  target_degree:                    { label: "Degree / programme", type: "text" },
  target_subject:                   { label: "Target subject", type: "text" },
  target_programme:                 { label: "Target programme", type: "text" },
  target_institution:               { label: "Target institution", type: "text" },
  target_role:                      { label: "Target role / job title", type: "text" },
  target_company:                   { label: "Target company", type: "text" },
  target_programme_or_role:         { label: "Target programme or role", type: "text" },
  scholarship_name:                 { label: "Scholarship name", type: "text" },
  // Limits
  word_limit:                       { label: "Word limit", hint: "Maximum words", type: "number" },
  length_limit:                     { label: "Length limit", hint: "Words (EN/ZH) or characters (KO)", type: "number" },
  // Academic
  academic_background:              { label: "Academic background", hint: "Degrees, institutions, GPA, relevant coursework", type: "textarea" },
  achievements:                     { label: "Key achievements", hint: "Academic, extracurricular, and professional highlights", type: "textarea" },
  academic_achievements:            { label: "Academic achievements", type: "textarea" },
  subject_interest_evidence:        { label: "Evidence of subject interest", hint: "Specific books, projects, experiments, competitions", type: "textarea" },
  relevant_reading_or_projects:     { label: "Relevant reading or independent projects", type: "textarea" },
  // Experience
  work_experience:                  { label: "Work / volunteer experience", type: "textarea" },
  extracurriculars:                 { label: "Extracurricular activities", type: "textarea" },
  current_background:               { label: "Current title / background", hint: "e.g. Final-year CS student at HCMUT", type: "text" },
  relevant_experience:              { label: "Relevant experience", hint: "Roles, projects, or achievements directly related to the role", type: "textarea" },
  key_skills:                       { label: "Key skills", hint: "Technical and soft skills — be specific", type: "textarea" },
  highlight_achievement:            { label: "Highlight achievement", hint: "Your single strongest result to feature prominently", type: "textarea" },
  applicant_strengths:              { label: "Applicant strengths", hint: "Qualities and skills for the referee to vouch for", type: "textarea" },
  specific_examples:                { label: "Specific examples or anecdotes", hint: "Concrete stories the referee witnessed first-hand", type: "textarea" },
  // Motivation
  motivation:                       { label: "Motivation for this role", type: "textarea" },
  company_motivation:               { label: "Why this company specifically", hint: "Name a product, value, initiative, or team", type: "textarea" },
  why_this_degree:                  { label: "Why this degree", type: "textarea" },
  why_australia:                    { label: "Why Australia / why this university", type: "textarea" },
  why_this_programme:               { label: "Why this programme", hint: "Name a specific course, professor, or research group", type: "textarea" },
  research_or_professional_interest:{ label: "Research or professional interest", type: "textarea" },
  career_goal:                      { label: "Long-term career goal", type: "textarea" },
  future_plans:                     { label: "Future plans", hint: "How the scholarship or opportunity enables your goals", type: "textarea" },
  // Essays
  personal_story:                   { label: "Personal story", hint: "A formative experience or moment that defines you", type: "textarea" },
  challenge_or_growth:              { label: "Challenge or moment of growth", type: "textarea" },
  intellectual_interest:            { label: "Intellectual interest / academic passion", type: "textarea" },
  prompt_text:                      { label: "Essay prompt", hint: "Paste the exact prompt or question", type: "textarea" },
  essay_prompt:                     { label: "Scholarship essay prompt", hint: "Paste the exact prompt", type: "textarea" },
  financial_or_personal_context:    { label: "Financial or personal context", type: "textarea" },
  community_impact_or_leadership:   { label: "Community impact or leadership", type: "textarea" },
  // Translation
  document_type:                    { label: "Document type", hint: "e.g. Diploma, Academic Transcript, Birth Certificate", type: "text" },
  purpose:                          { label: "Purpose of translation", hint: "e.g. University application in Korea, visa application", type: "text" },
  source_text_vi:                   { label: "Source document (Vietnamese)", hint: "Paste the full text of the original document", type: "textarea", rows: 8 },
};

const SYSTEM_FIELDS = new Set([
  "output_language",
  "goal",
  "destination",
  "target_word_count",
]);

function autoLabel(key: string): string {
  return key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function getMeta(key: string): FieldMeta {
  return FIELD_META[key] ?? { label: autoLabel(key), type: "textarea" };
}

function initSource(value: string): FieldSource {
  // Pre-seeded from DB (wizard or prior session) → prompt user to review
  return value.trim() ? "extracted" : "missing";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AnswersFormProps {
  sessionId: string;
  slug: string;
  docTypeName: string;
  requiredFields: string[];
  initialAnswers: Record<string, string>;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function AnswersForm({
  sessionId,
  slug: _slug,
  docTypeName,
  requiredFields,
  initialAnswers,
}: AnswersFormProps) {
  const router = useRouter();
  const t = useT("session");

  const questions = requiredFields.filter((f) => !SYSTEM_FIELDS.has(f));

  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(questions.map((f) => [f, initialAnswers[f] ?? ""])),
  );

  const [sources, setSources] = useState<Record<string, FieldSource>>(() =>
    Object.fromEntries(questions.map((f) => [f, initSource(initialAnswers[f] ?? "")])),
  );

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const savingRef = useRef(false);

  const saveToDb = useCallback(
    async (current: Record<string, string>) => {
      if (savingRef.current) return;
      savingRef.current = true;
      setSaveState("saving");
      try {
        const res = await fetch(`/api/sessions/${sessionId}/answers`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: current }),
        });
        setSaveState(res.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      } finally {
        savingRef.current = false;
      }
    },
    [sessionId],
  );

  // Capture latest answers in a ref so blur handlers always see fresh state
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  function handleChange(field: string, value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    setSaveState("idle");
  }

  function handleBlur(field: string) {
    const value = answersRef.current[field] ?? "";
    // Promote source: missing / extracted → confirm once the user has touched it
    setSources((prev) => ({
      ...prev,
      [field]: value.trim() ? "confirm" : "missing",
    }));
    saveToDb(answersRef.current);
  }

  // Progress
  const filled = questions.filter((f) => answers[f]?.trim().length > 0).length;
  const total = questions.length;
  const pct = total === 0 ? 100 : Math.round((filled / total) * 100);
  const allFilled = filled === total;

  function handleGenerate() {
    saveToDb(answersRef.current).then(() => {
      router.push(`/session/${sessionId}/generate`);
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      {/* ── Header ── */}
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
          {docTypeName}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("answersHeading")}
        </h1>
        <p className="text-sm text-neutral-500">{t("answersSubheading")}</p>
      </div>

      {/* ── Progress bar ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{t("progress", { filled, total })}</span>
          <span
            className={
              saveState === "error"
                ? "text-red-500"
                : saveState === "saving"
                  ? "text-neutral-400"
                  : saveState === "saved"
                    ? "text-green-600 dark:text-green-400"
                    : ""
            }
          >
            {saveState !== "idle" && t(`saveStatus.${saveState}` as "saveStatus.saved")}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-neutral-900 transition-all duration-300 dark:bg-white"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Questions ── */}
      <div className="space-y-6">
        {questions.map((field) => {
          const meta = getMeta(field);
          return (
            <QuestionField
              key={field}
              id={field}
              label={meta.label}
              hint={meta.hint}
              value={answers[field] ?? ""}
              source={sources[field] ?? "missing"}
              type={meta.type}
              rows={meta.rows}
              onChange={(v) => handleChange(field, v)}
              onBlur={() => handleBlur(field)}
            />
          );
        })}
      </div>

      {/* ── Generate button ── */}
      <div className="space-y-2 pt-2">
        {!allFilled && (
          <p className="text-center text-xs text-neutral-400">
            {t("fieldsRemaining", { count: total - filled })}
          </p>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!allFilled}
          className={[
            "w-full rounded-xl py-3 text-sm font-semibold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2",
            allFilled
              ? "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              : "cursor-not-allowed bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600",
          ].join(" ")}
        >
          {t("generateButton")}
        </button>
      </div>
    </main>
  );
}
