// ---------------------------------------------------------------------------
// AnswerSource
//
// Tracks how a form field got its current value so the UI can render
// colour-coded badges and borders without storing extra DB state.
//
//   "missing"   — field is empty; user must fill it before generating
//   "extracted" — filled by CV extraction; user should review (amber badge)
//   "user"      — user typed or explicitly confirmed the value (green badge)
// ---------------------------------------------------------------------------

export type AnswerSource = "missing" | "extracted" | "user";

// ---------------------------------------------------------------------------
// MergeResult
// ---------------------------------------------------------------------------

export interface MergeResult {
  /** Updated answer values. */
  answers: Record<string, string>;
  /** Updated source map. */
  sources: Record<string, AnswerSource>;
  /** Number of previously-empty slots that were filled by `incoming`. */
  filled: number;
  /** Number of incoming fields skipped because a value already existed. */
  skipped: number;
}

// ---------------------------------------------------------------------------
// mergeAnswers()
//
// Merges extracted data into existing answers, respecting occupied slots.
//
// Rules:
//   • Only fills a field when the CURRENT value is empty (trim === "").
//   • Fields already typed by the user ("user" source) are never overwritten.
//   • Fields already extracted but not yet confirmed ("extracted") are also
//     left alone — a second CV upload should not silently replace the first.
//   • Newly filled slots get source "extracted" (amber review badge).
//   • Sources for untouched fields are not changed.
//
// Usage:
//   const { answers, sources, filled } = mergeAnswers(
//     currentAnswers, currentSources, extractedAnswers
//   );
// ---------------------------------------------------------------------------

export function mergeAnswers(
  current: Record<string, string>,
  currentSources: Record<string, AnswerSource>,
  incoming: Record<string, string>,
): MergeResult {
  const answers = { ...current };
  const sources = { ...currentSources };
  let filled = 0;
  let skipped = 0;

  for (const [key, value] of Object.entries(incoming)) {
    const existing = (current[key] ?? "").trim();
    if (existing) {
      skipped++;
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed) continue;

    answers[key] = trimmed;
    sources[key] = "extracted";
    filled++;
  }

  return { answers, sources, filled, skipped };
}

// ---------------------------------------------------------------------------
// initSource()
//
// Derives the initial AnswerSource for a single field value loaded from DB.
// Values that already existed before the session were typed by the user.
// ---------------------------------------------------------------------------

export function initSource(value: string): AnswerSource {
  return value.trim() ? "user" : "missing";
}

// ---------------------------------------------------------------------------
// sourceOnBlur()
//
// Transitions the source after the user leaves a field.
//   • Non-empty → "user" (they owned the value)
//   • Empty     → "missing"
// ---------------------------------------------------------------------------

export function sourceOnBlur(value: string): AnswerSource {
  return value.trim() ? "user" : "missing";
}
