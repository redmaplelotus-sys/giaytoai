"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { getMeta, SYSTEM_FIELDS } from "@/lib/session/field-meta";
import { QuestionField, type FieldSource } from "./QuestionField";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initSource(value: string): FieldSource {
  // Pre-seeded from DB (wizard or prior session) → prompt user to review
  return value.trim() ? "extracted" : "missing";
}

// ---------------------------------------------------------------------------
// CV Extraction panel
// ---------------------------------------------------------------------------

interface CVPanelProps {
  sessionId: string;
  onExtracted: (values: Record<string, string>) => void;
}

function CVPanel({ sessionId, onExtracted }: CVPanelProps) {
  const [open, setOpen] = useState(false);
  const [cvText, setCvText] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [count, setCount] = useState(0);

  async function handleExtract() {
    if (!cvText.trim()) return;
    setState("loading");
    try {
      const res = await fetch(`/api/sessions/${sessionId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { extracted: Record<string, string>; count: number };
      setCount(data.count);
      onExtracted(data.extracted);
      setState("done");
      setOpen(false);
    } catch {
      setState("error");
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
      >
        <span className="font-medium">
          {state === "done"
            ? `✓ ${count} fields extracted from CV`
            : "Prefill from CV"}
        </span>
        <span aria-hidden="true" className="text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 pb-4 space-y-3">
          <p className="pt-3 text-xs text-neutral-400 leading-relaxed">
            Paste your CV or résumé text. Fields that can be extracted will be
            pre-filled for your review — nothing is saved until you blur each field.
          </p>
          <textarea
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            rows={6}
            placeholder="Paste CV text here…"
            className="w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder-neutral-300 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:placeholder-neutral-600 dark:focus:border-white dark:focus:ring-white"
          />
          <p className="text-right text-xs text-neutral-400 tabular-nums">
            {cvText.length.toLocaleString()} / 12,000 chars
          </p>
          {state === "error" && (
            <p className="text-xs text-red-500">Extraction failed — please try again.</p>
          )}
          <button
            type="button"
            onClick={handleExtract}
            disabled={!cvText.trim() || state === "loading" || cvText.length > 12_000}
            className={[
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2",
              cvText.trim() && state !== "loading" && cvText.length <= 12_000
                ? "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
                : "cursor-not-allowed bg-neutral-100 text-neutral-400 dark:bg-neutral-800",
            ].join(" ")}
          >
            {state === "loading" ? "Extracting…" : "Extract"}
          </button>
        </div>
      )}
    </div>
  );
}

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

  // Keep a ref so blur handlers always see current answers
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  function handleChange(field: string, value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    setSaveState("idle");
  }

  function handleBlur(field: string) {
    const value = answersRef.current[field] ?? "";
    setSources((prev) => ({
      ...prev,
      [field]: value.trim() ? "confirm" : "missing",
    }));
    saveToDb(answersRef.current);
  }

  // Called when CV extraction completes — bulk-apply extracted values
  function handleExtracted(extracted: Record<string, string>) {
    setAnswers((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(extracted)) {
        if (questions.includes(k)) next[k] = v;
      }
      return next;
    });
    setSources((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(extracted)) {
        if (questions.includes(k)) next[k] = "extracted";
      }
      return next;
    });
    // Save all extracted values to DB at once
    const merged = { ...answersRef.current, ...extracted };
    saveToDb(merged);
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

      {/* ── CV extraction panel ── */}
      <CVPanel sessionId={sessionId} onExtracted={handleExtracted} />

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
