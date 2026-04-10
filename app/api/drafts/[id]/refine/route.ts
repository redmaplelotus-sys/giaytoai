import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { anthropic } from "@/lib/anthropic";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Action definitions
// ---------------------------------------------------------------------------

export type RefinementAction =
  | "moreFormal"
  | "expand"
  | "shorten"
  | "addKeywords"
  | "cultureCheck"
  | "fixEnglish";

/** Actions that produce replacement text streamed into the editor. */
const REPLACE_ACTIONS = new Set<RefinementAction>([
  "moreFormal",
  "expand",
  "shorten",
  "addKeywords",
  "fixEnglish",
]);

/** Actions that produce analysis/feedback shown in a separate panel. */
const ANALYSIS_ACTIONS = new Set<RefinementAction>(["cultureCheck"]);

// ---------------------------------------------------------------------------
// Per-action prompt instructions
// ---------------------------------------------------------------------------

const ACTION_INSTRUCTIONS: Record<RefinementAction, string> = {
  moreFormal: `\
Rewrite the document below in a more formal, professional academic register.
- Eliminate casual contractions, colloquialisms, and conversational phrasing.
- Strengthen hedging language ("I think" → "I believe"; "try to" → "aim to").
- Preserve every factual claim, specific example, and structural paragraph exactly.
- Do not add or remove content — only adjust register.
Output: the rewritten document only. No preamble, no commentary.`,

  expand: `\
Expand this document by approximately 25–35% in word count.
- Add specific, evidence-backed details to each existing paragraph.
- Strengthen transitions and contextual framing.
- Do not invent new achievements or facts; elaborate on what is already stated.
- Maintain the applicant's voice and the existing structure.
Output: the expanded document only. No preamble, no commentary.`,

  shorten: `\
Condense this document by approximately 25–30% in word count.
- Remove redundant phrases, throat-clearing, and filler sentences.
- Merge ideas where two sentences make one stronger point.
- Preserve all specific examples, numbers, and institutional names.
- Do not cut any unique factual claims — only trim padding.
Output: the shortened document only. No preamble, no commentary.`,

  addKeywords: `\
Integrate relevant academic and professional keywords naturally into this document.
Use the "CONTEXT" section below for target programme / role vocabulary.
Rules:
- Only insert keywords where they fit naturally — never force them.
- Do not change the applicant's specific examples or achievements.
- Prefer keywords in the context of concrete evidence, not as standalone buzzwords.
Output: the revised document only. No preamble, no commentary.`,

  cultureCheck: `\
Analyse this document for cultural fit between Vietnamese academic writing norms and the target destination context.

Assess these five dimensions and give a 1–3 sentence evaluation of each:
1. **Directness** — Is self-advocacy appropriately confident, or is it softened by excessive Vietnamese modesty (*khiêm tốn*)?
2. **Evidence density** — Are claims backed by specific, named examples, or are they stated abstractly?
3. **Register** — Is the tone appropriate for the target admissions culture (AU/US/UK/KR)?
4. **Collective vs individual framing** — Does the document reflect individual ownership of achievements, or does it over-attribute to family/team?
5. **Red-flag phrases** — List any sentences that a non-Vietnamese admissions reader might find unusual, unclear, or culturally jarring.

Format: short paragraphs per dimension. End with a prioritised 3-item action list.
Output: the cultural analysis only.`,

  fixEnglish: `\
Fix all grammar, spelling, word-choice, and idiomatic-expression issues in this document.
Pay particular attention to ESL patterns common in Vietnamese-English writing:
- Missing or incorrect articles (a / an / the)
- Wrong prepositions (interested on → interested in; good in → good at)
- Incorrect verb tenses (especially past perfect and present perfect)
- Subject-verb agreement errors
- False cognates and over-literal translations
- Run-on sentences and comma splices
Preserve the applicant's meaning, structure, and specific examples exactly.
Output: the corrected document only. No preamble, no commentary.`,
};

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

const enc = new TextEncoder();
const sse  = (event: string, data: unknown) =>
  enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

// ---------------------------------------------------------------------------
// POST /api/drafts/[id]/refine
//
// Body: { action: RefinementAction, currentText: string }
//
// SSE events:
//   delta   — { text: string }                   (for REPLACE_ACTIONS)
//   analysis — { text: string }                  (for ANALYSIS_ACTIONS; accumulates)
//   done    — { action, inputTokens, outputTokens }
//   error   — { code, message }
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const rl = await checkRateLimit("draft", userId, request);
  if (!rl.allowed) return rateLimitResponse(rl);

  const { id: draftId } = await params;

  // ── Fetch draft + session answers ──────────────────────────────────────────
  const { data: draft, error: draftErr } = await supabaseAdmin
    .from("drafts")
    .select("id, user_id, session_id, content")
    .eq("id", draftId)
    .single();

  if (draftErr || !draft) {
    return new Response(JSON.stringify({ error: "Draft not found" }), { status: 404 });
  }
  if (draft.user_id !== userId) {
    return new Response(JSON.stringify({ error: "Draft not found" }), { status: 404 });
  }

  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("answers, document_types(slug, name_en, name_vi)")
    .eq("id", draft.session_id)
    .single();

  const answers   = (session?.answers ?? {}) as Record<string, unknown>;
  const dt        = Array.isArray(session?.document_types)
    ? session.document_types[0]
    : session?.document_types;
  const docType   = (dt?.name_en ?? dt?.name_vi ?? "document") as string;
  const slug      = (dt?.slug ?? "") as string;
  const target    = [
    answers.target_university ?? answers.target_institution ?? answers.target_company,
    answers.target_degree     ?? answers.target_programme   ?? answers.target_role,
  ].filter(Boolean).join(" — ");

  // ── Parse request body ────────────────────────────────────────────────────
  let body: unknown;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const action      = (body as { action?: unknown }).action as RefinementAction | undefined;
  const currentText = (body as { currentText?: unknown }).currentText;

  if (!action || !ACTION_INSTRUCTIONS[action]) {
    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 422 });
  }
  if (typeof currentText !== "string" || !currentText.trim()) {
    return new Response(JSON.stringify({ error: "currentText is required" }), { status: 422 });
  }

  // ── Build prompt ──────────────────────────────────────────────────────────
  const contextBlock = [
    `Document type: ${docType}`,
    slug    ? `Slug: ${slug}`   : null,
    target  ? `Target: ${target}` : null,
    answers.output_language ? `Output language: ${answers.output_language}` : null,
  ].filter(Boolean).join("\n");

  const instruction = ACTION_INSTRUCTIONS[action];

  const userMessage = [
    "INSTRUCTION",
    instruction,
    "",
    "CONTEXT",
    contextBlock,
    "",
    "DOCUMENT",
    currentText.trim(),
  ].join("\n");

  // ── Stream ────────────────────────────────────────────────────────────────
  const isAnalysis   = ANALYSIS_ACTIONS.has(action);
  const deltaEvent   = isAnalysis ? "analysis" : "delta";
  const model        = isAnalysis ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-6";

  const stream = new ReadableStream({
    async start(controller) {
      const enq = (chunk: Uint8Array) => { try { controller.enqueue(chunk); } catch {} };

      try {
        let inputTokens  = 0;
        let outputTokens = 0;

        const messageStream = anthropic.messages.stream({
          model,
          max_tokens: isAnalysis ? 1024 : 4096,
          system: [
            {
              type: "text",
              text: "You are a precise document-refinement assistant. Follow the instruction exactly. Never add meta-commentary about what you are doing.",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cache_control: { type: "ephemeral" } as any,
            },
          ],
          messages: [{ role: "user", content: userMessage }],
        });

        for await (const event of messageStream) {
          switch (event.type) {
            case "message_start":
              inputTokens = event.message.usage.input_tokens;
              break;
            case "content_block_delta":
              if (event.delta.type === "text_delta") {
                enq(sse(deltaEvent, { text: event.delta.text }));
              }
              break;
            case "message_delta":
              outputTokens = event.usage.output_tokens;
              break;
          }
        }

        enq(sse("done", { action, inputTokens, outputTokens }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[refine:${action}]`, message);
        enq(sse("error", { code: "refine_failed", message }));
      } finally {
        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
      ...Object.fromEntries(
        Object.entries({
          "X-RateLimit-Limit":     String(rl.limit),
          "X-RateLimit-Remaining": String(rl.remaining),
        })
      ),
    },
  });
}
