"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT, useTA } from "@/lib/i18n";
import { DocTypePreviewCard } from "@/app/components/DocTypePreviewCard";
import { OUTPUT_LANGUAGES, type OutputLanguageCode } from "@/lib/prompts/compile";
import type { DocTypeSlug } from "@/lib/prompts/registry";

// ---------------------------------------------------------------------------
// Static config — proper nouns stay in English; flags are universal
// ---------------------------------------------------------------------------

type Goal = "study" | "job" | "immigration" | "business";

const GOAL_ICONS: Record<Goal, string> = {
  study: "🎓",
  job: "💼",
  immigration: "✈️",
  business: "🤝",
};

type Destination = { code: string; flag: string; name: string };

const DESTINATIONS: Record<Goal, Destination[]> = {
  study: [
    { code: "au", flag: "🇦🇺", name: "Australia" },
    { code: "us", flag: "🇺🇸", name: "USA" },
    { code: "uk", flag: "🇬🇧", name: "UK" },
    { code: "ko", flag: "🇰🇷", name: "Korea" },
    { code: "cn", flag: "🇨🇳", name: "China" },
    { code: "ca", flag: "🇨🇦", name: "Canada" },
    { code: "de", flag: "🇩🇪", name: "Germany" },
    { code: "jp", flag: "🇯🇵", name: "Japan" },
  ],
  job: [
    { code: "vn", flag: "🇻🇳", name: "Vietnam" },
    { code: "au", flag: "🇦🇺", name: "Australia" },
    { code: "us", flag: "🇺🇸", name: "USA" },
    { code: "uk", flag: "🇬🇧", name: "UK" },
    { code: "ko", flag: "🇰🇷", name: "Korea" },
    { code: "jp", flag: "🇯🇵", name: "Japan" },
    { code: "sg", flag: "🇸🇬", name: "Singapore" },
    { code: "de", flag: "🇩🇪", name: "Germany" },
  ],
  immigration: [
    { code: "au", flag: "🇦🇺", name: "Australia" },
    { code: "us", flag: "🇺🇸", name: "USA" },
    { code: "ca", flag: "🇨🇦", name: "Canada" },
    { code: "uk", flag: "🇬🇧", name: "UK" },
    { code: "ko", flag: "🇰🇷", name: "Korea" },
    { code: "jp", flag: "🇯🇵", name: "Japan" },
    { code: "de", flag: "🇩🇪", name: "Germany" },
    { code: "fr", flag: "🇫🇷", name: "France" },
  ],
  business: [
    { code: "au", flag: "🇦🇺", name: "Australia" },
    { code: "us", flag: "🇺🇸", name: "USA" },
    { code: "uk", flag: "🇬🇧", name: "UK" },
    { code: "ko", flag: "🇰🇷", name: "Korea" },
    { code: "jp", flag: "🇯🇵", name: "Japan" },
    { code: "sg", flag: "🇸🇬", name: "Singapore" },
  ],
};

/** Default suggested word counts shown in the placeholder. */
const WORD_COUNT_DEFAULTS: Partial<Record<DocTypeSlug, number>> = {
  "personal-statement-au": 900,
  "personal-statement-us": 650,
  "cover-letter": 400,
  "motivation-letter": 600,
  "scholarship-essay": 500,
  "reference-letter": 400,
};

function resolveDocTypeSlug(goal: Goal, destination: string): DocTypeSlug {
  if (goal === "study") {
    if (destination === "au") return "personal-statement-au";
    if (destination === "us") return "personal-statement-us";
    if (destination === "uk") return "personal-statement-uk";
    return "motivation-letter";
  }
  if (goal === "job") return "cover-letter";
  if (goal === "immigration") return "translation-prep";
  return "motivation-letter"; // business
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewSessionPage() {
  const router = useRouter();
  const t = useT("newSession");
  const m = useTA();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [outputLang, setOutputLang] = useState<OutputLanguageCode>("en");
  const [wordCount, setWordCount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goals = (["study", "job", "immigration", "business"] as Goal[]);
  const destinations = goal ? DESTINATIONS[goal] : [];

  // Reset destination when goal changes
  function handleGoalSelect(g: Goal) {
    setGoal(g);
    setDestination(null);
  }

  const slug =
    goal && destination ? resolveDocTypeSlug(goal, destination) : null;

  const defaultWordCount = slug ? WORD_COUNT_DEFAULTS[slug] : undefined;

  const canContinue = slug !== null && !submitting;

  async function handleContinue() {
    if (!slug || !goal || !destination) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          answers: {
            output_language: outputLang,
            ...(wordCount ? { target_word_count: parseInt(wordCount, 10) } : {}),
            goal,
            destination,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? res.statusText);
      }
      const data = await res.json();
      if (!res.ok) {
        const code = (data as { error?: string }).error;
        throw new Error(code === "no_credits" ? "no_credits" : (code ?? res.statusText));
      }
      router.push(`/session/${(data as { id: string }).id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>

      {/* ── Goal cards ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
          {t("goalHeading")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {goals.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => handleGoalSelect(g)}
              aria-pressed={goal === g}
              className={[
                "flex flex-col items-center gap-2 rounded-xl border p-4 text-center",
                "transition-colors focus-visible:outline-none focus-visible:ring-2",
                goal === g
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  : "border-neutral-200 bg-white hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-400",
              ].join(" ")}
            >
              <span className="text-2xl leading-none" aria-hidden="true">
                {GOAL_ICONS[g]}
              </span>
              <span className="text-sm font-medium">
                {m.newSession.goals[g]}
              </span>
              <span
                className={[
                  "text-xs leading-snug",
                  goal === g
                    ? "text-neutral-300 dark:text-neutral-600"
                    : "text-neutral-400",
                ].join(" ")}
              >
                {m.newSession.goalDescriptions[g]}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Destination pills ── */}
      {goal && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
            {t("destinationHeading")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {destinations.map(({ code, flag, name }) => (
              <button
                key={code}
                type="button"
                onClick={() => setDestination(code)}
                aria-pressed={destination === code}
                className={[
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
                  "transition-colors focus-visible:outline-none focus-visible:ring-2",
                  destination === code
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-200 bg-white hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-400",
                ].join(" ")}
              >
                <span aria-hidden="true">{flag}</span>
                <span>{name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Output language ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
          {t("outputLangHeading")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(OUTPUT_LANGUAGES) as [OutputLanguageCode, { label: string; instruction: string }][]).map(
            ([code, { label }]) => (
              <button
                key={code}
                type="button"
                onClick={() => setOutputLang(code)}
                aria-pressed={outputLang === code}
                className={[
                  "rounded-full border px-3 py-1.5 text-sm",
                  "transition-colors focus-visible:outline-none focus-visible:ring-2",
                  outputLang === code
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-200 bg-white hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-400",
                ].join(" ")}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </section>

      {/* ── Word count ── */}
      <section className="space-y-2">
        <label
          htmlFor="word-count"
          className="block text-sm font-medium text-neutral-500 uppercase tracking-wider"
        >
          {t("wordCountLabel")}
        </label>
        <input
          id="word-count"
          type="number"
          min={50}
          max={10000}
          step={50}
          value={wordCount}
          onChange={(e) => setWordCount(e.target.value)}
          placeholder={defaultWordCount ? String(defaultWordCount) : "—"}
          className={[
            "w-40 rounded-lg border px-3 py-2 text-sm",
            "border-neutral-200 bg-white placeholder-neutral-400",
            "focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900",
            "dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white dark:focus:ring-white",
          ].join(" ")}
        />
        <p className="text-xs text-neutral-400">{t("wordCountHint")}</p>
      </section>

      {/* ── Resolved doc type preview ── */}
      {slug && <DocTypePreviewCard slug={slug} />}

      {/* ── Error ── */}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error === "no_credits" ? m.errors.noCredits : (m.errors.generic)}
        </p>
      )}

      {/* ── Continue ── */}
      <button
        type="button"
        onClick={handleContinue}
        disabled={!canContinue}
        className={[
          "w-full rounded-xl py-3 text-sm font-semibold transition-colors",
          "focus-visible:outline-none focus-visible:ring-2",
          canContinue
            ? "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            : "cursor-not-allowed bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600",
        ].join(" ")}
      >
        {submitting ? m.common.loading : t("continueButton")}
      </button>
    </main>
  );
}
