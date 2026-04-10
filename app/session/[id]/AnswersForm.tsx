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

  const filled = questions.filter((f) => answers[f]?.trim().length > 0).length;
  const total = questions.length;
  const pct = total === 0 ? 100 : Math.round((filled / total) * 100);
  const allFilled = filled === total;

  function handleGenerate() {
    saveToDb(answersRef.current).then(() => {
      router.push(`/session/${sessionId}/generate`);
    });
  }

  const saveStatusColor: Record<SaveState, string> = {
    idle:   "transparent",
    saving: "var(--color-text-muted)",
    saved:  "var(--color-green)",
    error:  "var(--color-red)",
  };

  return (
    <main className="page-container-wide py-10 space-y-8">
      {/* ── Header ── */}
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          {docTypeName}
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
          {t("answersHeading")}
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{t("answersSubheading")}</p>
      </div>

      {/* ── CV drop zone ── */}
      <CvDropZone sessionId={sessionId} onExtracted={handleExtracted} />

      {/* ── Progress bar ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
          <span>{t("progress", { filled, total })}</span>
          <span style={{ color: saveStatusColor[saveState] }}>
            {saveState !== "idle" && t(`saveStatus.${saveState}` as "saveStatus.saved")}
          </span>
        </div>
        <div
          className="overflow-hidden"
          style={{ height: 6, borderRadius: 9999, background: "var(--color-border-default)" }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 9999,
              width: `${pct}%`,
              background: "var(--color-navy)",
              transition: "width 0.3s",
            }}
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
          <p className="text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
            {t("fieldsRemaining", { count: total - filled })}
          </p>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!allFilled}
          className="btn-primary w-full"
          style={{ padding: "12px 20px", borderRadius: "var(--radius-xl)", fontSize: 15 }}
        >
          {t("generateButton")}
        </button>
      </div>
    </main>
  );
}
