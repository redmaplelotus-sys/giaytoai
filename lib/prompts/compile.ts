import { systemPromptBlock } from "@/lib/prompts/system";
import { PROMPT_REGISTRY, DocTypeSlug } from "@/lib/prompts/registry";
import type Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Output language registry
// Maps sessions.answers.output_language codes to the full instruction string
// injected into Layer 2 so every template gets a consistent language directive.
// ---------------------------------------------------------------------------
export const OUTPUT_LANGUAGES: Record<string, string> = {
  vi: "Vietnamese (Tiếng Việt). Use formal register appropriate for academic or professional documents.",
  en: "English. Use formal, professional register. British or American spelling is acceptable; be consistent.",
  ko: "Korean (한국어). Use formal 합쇼체 (–ㅂ니다 / –습니다) endings throughout.",
  zh: "Simplified Chinese (简体中文). Use formal written register (书面语). Address the reader as 您.",
};

const VARIABLE_RE = /\{\{(\w+)\}\}/g;

// ---------------------------------------------------------------------------
// compileContext()
//
// Assembles the three layers for a single generation request:
//
//   Layer 1 — system prompt (static, cache-eligible)
//   Layer 2 — document-type template with output-language directive prepended
//   Layer 3 — user answers interpolated into the Layer 2 template
//
// Returns a { system, userPrompt } object ready to pass to messages.create().
// Missing answer variables are replaced with an empty string and recorded in
// `missingFields` so the caller can decide whether to abort or continue.
// ---------------------------------------------------------------------------
export interface CompileResult {
  /** Pass directly as the `system` field in messages.create(). */
  system: Anthropic.MessageParam["content"] extends infer C
    ? C
    : never;
  /** Pass as the content of the first user message. */
  userPrompt: string;
  /** Variables referenced in the template that had no value in answers. */
  missingFields: string[];
}

export function compileContext(
  slug: DocTypeSlug,
  answers: Record<string, unknown>,
): CompileResult {
  const tpl = PROMPT_REGISTRY[slug];
  if (!tpl) {
    throw new Error(`No prompt template registered for slug: ${slug}`);
  }

  // --- Layer 2: prepend output-language directive to the template ---
  const langCode = String(answers.output_language ?? "en").toLowerCase();
  const langInstruction =
    OUTPUT_LANGUAGES[langCode] ??
    `${answers.output_language}. Use formal register.`;

  const layer2 = `OUTPUT LANGUAGE INSTRUCTION\nWrite the entire document in: ${langInstruction}\n\n---\n\n${tpl.template}`;

  // --- Layer 3: interpolate {{variable}} placeholders with answers ---
  const missingFields: string[] = [];

  const userPrompt = layer2.replace(VARIABLE_RE, (_match, key: string) => {
    const value = answers[key];
    if (value === undefined || value === null || value === "") {
      missingFields.push(key);
      return "";
    }
    return String(value);
  });

  // --- Layer 1: system prompt block (cache-eligible, returned as-is) ---
  const system = [systemPromptBlock] as CompileResult["system"];

  return { system, userPrompt, missingFields };
}
