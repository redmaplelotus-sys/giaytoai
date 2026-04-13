import { anthropic } from "@/lib/anthropic";

// ---------------------------------------------------------------------------
// QualityReport — structured output from the Haiku quality-check call
// ---------------------------------------------------------------------------
export interface WordCountStatus {
  actual: number;
  target: number | null;
  /** "ok" | "over" | "under" | "unknown" */
  status: "ok" | "over" | "under" | "unknown";
  /** Difference from target (positive = over, negative = under). */
  delta: number | null;
}

export interface QualityReport {
  wordCountStatus: WordCountStatus;
  /** 1–5 rating of tonal appropriateness for the document type and destination. */
  toneScore: 1 | 2 | 3 | 4 | 5;
  /** Short description of the dominant tone and whether it fits the context. */
  toneNote: string;
  /** 1–5 rating: 5 = concrete details and named examples; 1 = vague generalities. */
  specificityScore: 1 | 2 | 3 | 4 | 5;
  /** Issues that should be fixed before submission. */
  warnings: string[];
  /** Things the draft does well. */
  strengths: string[];
  /** Raw model used for this check. */
  model: string;
}

// ---------------------------------------------------------------------------
// Haiku system prompt for quality checking (kept short — no caching needed)
// ---------------------------------------------------------------------------
const QC_SYSTEM = `\
You are a quality-checking assistant for study-abroad application documents.
Analyse the supplied draft and return a JSON object with this exact shape:

{
  "word_count_actual": <integer>,
  "target_word_count": <integer or null if not provided>,
  "tone_score": <1–5>,
  "tone_note": "<one sentence in Vietnamese>",
  "specificity_score": <1–5>,
  "warnings": ["<string in Vietnamese>", ...],
  "strengths": ["<string in Vietnamese>", ...]
}

IMPORTANT: All text values (tone_note, warnings, strengths) MUST be written in Vietnamese.

Scoring guides:
- tone_score 5 = register is exactly right for destination and document type; 1 = clearly wrong register (e.g. casual for a UCAS statement).
- specificity_score 5 = named institutions, projects, dates, outcomes; 1 = nothing but generic claims.
- warnings: flag forbidden phrases, missing required sections, vague claims, self-deprecating language, over-word-count, under-word-count (>5% off target), placeholders left in body. Write in Vietnamese.
- strengths: genuine positives only — do not pad. Write in Vietnamese.

Return valid JSON only. No text outside the JSON object.\
`;

// ---------------------------------------------------------------------------
// checkQualityAsync()
// Calls Haiku for a fast, cheap quality pass. Returns a structured report.
// Designed to be called after streamDraft() completes, before saving the export.
// ---------------------------------------------------------------------------
export async function checkQualityAsync(
  draftText: string,
  documentType: string,
  targetWordCount?: number,
): Promise<QualityReport> {
  const model = "claude-haiku-4-5-20251001";

  const userMessage = [
    `Document type: ${documentType}`,
    targetWordCount ? `Target word count: ${targetWordCount}` : "No word count target specified.",
    "",
    "DRAFT:",
    draftText,
  ].join("\n");

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: QC_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = response.content[0];
  if (raw.type !== "text") {
    throw new Error("Quality check returned unexpected content type");
  }

  let parsed: {
    word_count_actual: number;
    target_word_count: number | null;
    tone_score: number;
    tone_note: string;
    specificity_score: number;
    warnings: string[];
    strengths: string[];
  };

  try {
    // Strip optional ```json ... ``` fences before parsing
    const text = raw.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    throw new Error(`Quality check returned invalid JSON: ${raw.text.slice(0, 200)}`);
  }

  const actual = parsed.word_count_actual;
  const target = parsed.target_word_count ?? targetWordCount ?? null;
  const delta = target !== null ? actual - target : null;

  let status: WordCountStatus["status"] = "unknown";
  if (target !== null) {
    const tolerance = Math.ceil(target * 0.05);
    if (Math.abs(delta!) <= tolerance) status = "ok";
    else if (delta! > 0) status = "over";
    else status = "under";
  }

  return {
    wordCountStatus: { actual, target, status, delta },
    toneScore: clamp(parsed.tone_score) as QualityReport["toneScore"],
    toneNote: parsed.tone_note,
    specificityScore: clamp(parsed.specificity_score) as QualityReport["specificityScore"],
    warnings: parsed.warnings ?? [],
    strengths: parsed.strengths ?? [],
    model,
  };
}

function clamp(n: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, Math.round(n))) as 1 | 2 | 3 | 4 | 5;
}
