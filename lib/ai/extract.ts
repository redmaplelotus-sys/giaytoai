import { anthropic } from "@/lib/anthropic";
import { FIELD_META } from "@/lib/session/field-meta";

// Fields that cannot meaningfully be extracted from a CV — skip them.
const NON_EXTRACTABLE = new Set([
  "output_language",
  "goal",
  "destination",
  "target_word_count",
  "word_limit",
  "length_limit",
  "prompt_text",
  "essay_prompt",
  "motivation",
  "company_motivation",
  "why_this_degree",
  "why_australia",
  "why_this_programme",
  "why_this_programme",
  "financial_or_personal_context",
  "future_plans",
  "document_type",
  "purpose",
  "source_text_vi",
]);

const EXTRACT_SYSTEM = `\
You are a CV parser. Extract structured information from the supplied CV or résumé text to pre-fill an application form.

Rules:
1. Only extract information that is clearly stated in the CV. Do not invent, infer, or pad.
2. Keep values factual and concise — 1–3 sentences per field, or a short list for skills/achievements.
3. For fields you cannot find evidence for, return an empty string "".
4. Preserve specific numbers, dates, GPA, rankings, and institution names exactly as written.
5. Return valid JSON only — no markdown fences, no text outside the object.\
`;

export interface ExtractionResult {
  /** Fields successfully extracted — values are non-empty. */
  extracted: Record<string, string>;
  /** Number of fields that had extractable content. */
  count: number;
}

/**
 * Runs Claude Haiku over `cvText` and attempts to populate every field
 * in `targetFields` that is plausibly derivable from a CV.
 * Non-extractable fields (motivation questions, prompts, etc.) are skipped.
 */
export async function extractFromCV(
  cvText: string,
  targetFields: string[],
): Promise<ExtractionResult> {
  const extractable = targetFields.filter((f) => !NON_EXTRACTABLE.has(f));

  if (extractable.length === 0) {
    return { extracted: {}, count: 0 };
  }

  // Build a clear field list so the model knows what to produce
  const fieldList = extractable
    .map((key) => {
      const meta = FIELD_META[key];
      const desc = meta
        ? `${meta.label}${meta.hint ? ` (${meta.hint})` : ""}`
        : key;
      return `"${key}": ${desc}`;
    })
    .join("\n");

  const userMessage = `FIELDS TO EXTRACT:\n${fieldList}\n\nCV TEXT:\n${cvText}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: EXTRACT_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = response.content[0];
  if (raw.type !== "text") {
    return { extracted: {}, count: 0 };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw.text.replace(/^```json?\n?|\n?```$/g, "").trim());
  } catch {
    return { extracted: {}, count: 0 };
  }

  const extracted: Record<string, string> = {};
  for (const key of extractable) {
    const val = parsed[key];
    if (typeof val === "string" && val.trim()) {
      extracted[key] = val.trim();
    }
  }

  return { extracted, count: Object.keys(extracted).length };
}
