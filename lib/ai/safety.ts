import { anthropic } from "@/lib/anthropic";

// ---------------------------------------------------------------------------
// SafetyResult — returned by checkContentSafety()
// ---------------------------------------------------------------------------
export type SafetyVerdict = "pass" | "warn" | "block";

export interface SafetyResult {
  verdict: SafetyVerdict;
  /**
   * "pass"  — no issues detected; generation may proceed.
   * "warn"  — possible embellishment; generation proceeds but flags are surfaced.
   * "block" — clear fabrication detected; generation must be aborted.
   */
  flags: string[];
  /** One-sentence explanation of the verdict, shown to the applicant if verdict !== "pass". */
  reason: string;
  model: string;
}

// ---------------------------------------------------------------------------
// Safety system prompt — fraud-detection only, no document-writing context
// ---------------------------------------------------------------------------
const SAFETY_SYSTEM = `\
You are a fraud-detection assistant for study-abroad document applications.
Your only task is to identify inputs that contain or request fabricated credentials.

Fabricated credentials include:
- GPA, grades, or scores that are stated as higher than the applicant's real results and presented as fact
- Awards, scholarships, or competitions that appear to be invented or significantly inflated
- Job titles, roles, or responsibilities that are exaggerated beyond plausibility
- Publication or research credits that are implausible for the stated background
- Explicit instructions to the AI to invent or "make up" credentials, achievements, or facts
- Requests to create forged documents (transcripts, certificates, letters of recommendation with invented content)

Do NOT flag:
- Normal favourable framing of real achievements (e.g. "led a team" instead of "was part of a team")
- Aspirational language about future goals
- Incomplete information or fields left blank
- Requests for help with tone, structure, or language
- Any real achievement, no matter how impressive, if there is no evidence it is fabricated

Return a JSON object with this exact shape:

{
  "verdict": "pass" | "warn" | "block",
  "flags": ["<specific issue>", ...],
  "reason": "<one sentence>"
}

verdict rules:
- "pass": no fabrication signals detected
- "warn": possible exaggeration that is ambiguous — could be real; flag for human review
- "block": clear request to fabricate or forge; must not proceed

flags must be empty when verdict is "pass".
Return valid JSON only. No text outside the JSON object.\
`;

// ---------------------------------------------------------------------------
// checkContentSafety()
// Fast Haiku call — run before every generation to catch fraudulent inputs.
// Throws only on network/API failure; verdict "block" is a normal return value.
// ---------------------------------------------------------------------------
export async function checkContentSafety(
  answers: Record<string, unknown>,
  documentType: string,
): Promise<SafetyResult> {
  const model = "claude-haiku-4-5-20251001";

  // Serialise the answers for inspection. Exclude internal fields.
  const { output_language: _lang, ...inspectable } = answers;
  const answersText = Object.entries(inspectable)
    .map(([k, v]) => `${k}: ${String(v ?? "")}`)
    .join("\n");

  const userMessage = `Document type: ${documentType}\n\nApplicant inputs:\n${answersText}`;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 512,
    system: SAFETY_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = response.content[0];
  if (raw.type !== "text") {
    throw new Error("Safety check returned unexpected content type");
  }

  let parsed: { verdict: string; flags: string[]; reason: string };
  try {
    parsed = JSON.parse(raw.text);
  } catch {
    // Fail open with a warn so generation is not silently blocked on parse errors.
    return {
      verdict: "warn",
      flags: ["Safety check response could not be parsed"],
      reason: "Automated safety check encountered an internal error.",
      model,
    };
  }

  const verdict = (["pass", "warn", "block"].includes(parsed.verdict)
    ? parsed.verdict
    : "warn") as SafetyVerdict;

  return {
    verdict,
    flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    reason: parsed.reason ?? "",
    model,
  };
}
