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

  const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  };

  return (
    <main className="page-container space-y-8" style={{ paddingTop: 40, paddingBottom: 40 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
        {t("heading")}
      </h1>

      {/* ── Goal cards ── */}
      <section className="space-y-3">
        <h2 style={labelStyle}>{t("goalHeading")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {goals.map((g) => {
            const active = goal === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => handleGoalSelect(g)}
                aria-pressed={active}
                className="flex flex-col items-center gap-2 p-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2"
                style={{
                  borderRadius: "var(--radius-lg)",
                  border: active ? "1.5px solid var(--color-navy)" : "1px solid var(--color-border-default)",
                  background: active ? "var(--color-navy)" : "var(--color-bg-surface)",
                  boxShadow: "var(--shadow-card)",
                  color: active ? "#ffffff" : "var(--color-text-body)",
                }}
              >
                <span className="text-2xl leading-none" aria-hidden="true">{GOAL_ICONS[g]}</span>
                <span className="text-sm font-medium">{m.newSession.goals[g]}</span>
                <span
                  className="text-xs leading-snug"
                  style={{ color: active ? "rgba(255,255,255,0.7)" : "var(--color-text-muted)" }}
                >
                  {m.newSession.goalDescriptions[g]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Destination pills ── */}
      {goal && (
        <section className="space-y-3">
          <h2 style={labelStyle}>{t("destinationHeading")}</h2>
          <div className="flex flex-wrap gap-2">
            {destinations.map(({ code, flag, name }) => {
              const active = destination === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setDestination(code)}
                  aria-pressed={active}
                  className={`btn-pill ${active ? "btn-pill-active" : ""}`}
                >
                  <span aria-hidden="true">{flag}</span>
                  <span>{name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Output language ── */}
      <section className="space-y-3">
        <h2 style={labelStyle}>{t("outputLangHeading")}</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(OUTPUT_LANGUAGES) as [OutputLanguageCode, { label: string; instruction: string }][]).map(
            ([code, { label }]) => {
              const active = outputLang === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setOutputLang(code)}
                  aria-pressed={active}
                  className={`btn-pill ${active ? "btn-pill-active" : ""}`}
                >
                  {label}
                </button>
              );
            },
          )}
        </div>
      </section>

      {/* ── Word count ── */}
      <section className="space-y-2">
        <label
          htmlFor="word-count"
          style={labelStyle}
          className="block"
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
          className="input-field"
          style={{ width: 160 }}
        />
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{t("wordCountHint")}</p>
      </section>

      {/* ── Resolved doc type preview ── */}
      {slug && <DocTypePreviewCard slug={slug} />}

      {/* ── Error ── */}
      {error && (
        <p role="alert" className="text-sm" style={{ color: "var(--color-red)" }}>
          {error === "no_credits" ? m.errors.noCredits : m.errors.generic}
        </p>
      )}

      {/* ── Continue ── */}
      <button
        type="button"
        onClick={handleContinue}
        disabled={!canContinue}
        className="btn-primary w-full"
        style={{ padding: "12px 20px", borderRadius: "var(--radius-xl)", fontSize: 15 }}
      >
        {submitting ? m.common.loading : t("continueButton")}
      </button>
    </main>
  );
}
