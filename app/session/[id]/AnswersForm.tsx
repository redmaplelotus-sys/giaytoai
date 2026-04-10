"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { getMeta, SYSTEM_FIELDS } from "@/lib/session/field-meta";
import {
  type AnswerSource,
  initSource,
  sourceOnBlur,
  mergeAnswers,
} from "@/lib/session/answers";
import { QuestionField } from "./QuestionField";
import { CvDropZone } from "./CvDropZone";

// ---------------------------------------------------------------------------
// Main form
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

  const [sources, setSources] = useState<Record<string, AnswerSource>>(() =>
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

  // Refs so event handlers always read current state without stale closures.
  const answersRef = useRef(answers);
  const sourcesRef = useRef(sources);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { sourcesRef.current = sources; }, [sources]);

  function handleChange(field: string, value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    setSaveState("idle");
  }

  function handleBlur(field: string) {
    const value = answersRef.current[field] ?? "";
    setSources((prev) => ({ ...prev, [field]: sourceOnBlur(value) }));
    saveToDb(answersRef.current);
  }

  // Called when CV extraction completes — only fills empty slots.
  function handleExtracted(extracted: Record<string, string>) {
    const relevant = Object.fromEntries(
      Object.entries(extracted).filter(([k]) => questions.includes(k)),
    );

    const { answers: nextAnswers, sources: nextSources } = mergeAnswers(
      answersRef.current,
      sourcesRef.current,
      relevant,
    );

    setAnswers(nextAnswers);
    setSources(nextSources);
    saveToDb(nextAnswers);
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

      {/* ── CV drop zone ── */}
      <CvDropZone sessionId={sessionId} onExtracted={handleExtracted} />

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
