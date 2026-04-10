import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, rateLimitResponse, rateLimitHeaders } from "@/lib/rate-limit";
import { compileContext } from "@/lib/prompts/compile";
import type { DocTypeSlug } from "@/lib/prompts/registry";
import { streamDraft } from "@/lib/ai/stream";
import { checkContentSafety } from "@/lib/ai/safety";
import { checkQualityAsync } from "@/lib/ai/quality";
import { consumeCredit, refundCredit } from "@/lib/db/users";
import { createDraft, completeDraft, updateDraftQuality } from "@/lib/db/drafts";
import { updateSessionStatus } from "@/lib/db/sessions";

// ---------------------------------------------------------------------------
// Route config
// ---------------------------------------------------------------------------
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------
const enc = new TextEncoder();

function sseEvent(event: string, data: unknown): Uint8Array {
  return enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function sseError(code: string, message: string): Uint8Array {
  return sseEvent("error", { code, message });
}

// ---------------------------------------------------------------------------
// POST /api/sessions/[id]/generate
//
// Returns a text/event-stream SSE response. Events:
//   safety  — { verdict, flags, reason }         (only when verdict !== "pass")
//   delta   — { text: string }                   (one per streamed token batch)
//   done    — { draftId, inputTokens, outputTokens, firstTokenMs, totalMs,
//               quality: QualityReport | null }
//   error   — { code: string, message: string }
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  // ── 2. Rate limit ─────────────────────────────────────────────────────────
  const rl = await checkRateLimit("draft", userId, request);
  if (!rl.allowed) return rateLimitResponse(rl);

  // ── Fetch session + user in parallel ──────────────────────────────────────
  const [userResult, sessionResult] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("clerk_id, plan, credits_remaining")
      .eq("clerk_id", userId)
      .single(),
    supabaseAdmin
      .from("sessions")
      .select("id, user_id, answers, status, document_types(id, slug, name_en, name_vi)")
      .eq("id", sessionId)
      .single(),
  ]);

  if (userResult.error || !userResult.data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (sessionResult.error || !sessionResult.data) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (sessionResult.data.user_id !== userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const user    = userResult.data;
  const session = sessionResult.data;
  const dt      = Array.isArray(session.document_types)
    ? session.document_types[0]
    : session.document_types;
  const slug    = dt?.slug as DocTypeSlug | undefined;

  if (!slug) {
    return NextResponse.json({ error: "Session has no document type" }, { status: 422 });
  }

  const answers       = (session.answers ?? {}) as Record<string, unknown>;
  const docTypeName   = (dt?.name_en ?? dt?.name_vi ?? slug) as string;
  const targetWords   = typeof answers.target_word_count === "number"
    ? answers.target_word_count
    : undefined;

  // Unlimited plan users skip the credit check entirely.
  const isUnlimited = user.plan === "unlimited";

  if (!isUnlimited && user.credits_remaining <= 0) {
    return NextResponse.json({ error: "no_credits" }, { status: 402 });
  }

  // ── 3. Content safety check ───────────────────────────────────────────────
  // Run before consuming credit so we never charge for blocked requests.
  const safety = await checkContentSafety(answers, docTypeName);

  if (safety.verdict === "block") {
    return NextResponse.json(
      { error: "content_blocked", reason: safety.reason, flags: safety.flags },
      { status: 422 },
    );
  }

  // ── 4. Consume credit ─────────────────────────────────────────────────────
  if (!isUnlimited) {
    try {
      await consumeCredit(userId);
    } catch {
      return NextResponse.json({ error: "no_credits" }, { status: 402 });
    }
  }

  // ── 5. Create draft placeholder ───────────────────────────────────────────
  let draftId: string;
  try {
    const draft = await createDraft(sessionId, userId);
    draftId = draft.id as string;
  } catch (err) {
    if (!isUnlimited) await refundCredit(userId).catch(() => {});
    console.error("[generate] createDraft failed:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  // ── Mark session as processing ────────────────────────────────────────────
  await updateSessionStatus(sessionId, "processing").catch(() => {});

  // ── 6. Compile context ────────────────────────────────────────────────────
  let compiled: ReturnType<typeof compileContext>;
  try {
    compiled = compileContext(slug, answers);
  } catch (err) {
    if (!isUnlimited) await refundCredit(userId).catch(() => {});
    await updateSessionStatus(sessionId, "failed").catch(() => {});
    console.error("[generate] compileContext failed:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  // ── 7–9. Stream Claude, forward as SSE, save on complete ──────────────────
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: Uint8Array) => {
        try { controller.enqueue(chunk); } catch { /* stream already closed */ }
      };

      // Forward safety warning to client before first token (non-blocking)
      if (safety.verdict === "warn") {
        enqueue(sseEvent("safety", {
          verdict: safety.verdict,
          flags:   safety.flags,
          reason:  safety.reason,
        }));
      }

      let fullText = "";
      let creditConsumed = true; // already consumed above

      try {
        // ── 7 + 8. Stream Claude → SSE forward ────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let doneChunk: any = null;

        for await (const chunk of streamDraft(compiled)) {
          if (chunk.type === "delta") {
            fullText += chunk.text;
            enqueue(sseEvent("delta", { text: chunk.text }));
          } else if (chunk.type === "done") {
            doneChunk = chunk;
          } else if (chunk.type === "error") {
            throw new Error(chunk.message);
          }
        }

        if (!doneChunk) throw new Error("Stream ended without done event");

        // ── 9a. Save draft ─────────────────────────────────────────────────
        // If Claude returned JSON (legacy), extract the body field before saving.
        let saveText = fullText;
        if (fullText.trimStart().startsWith("{")) {
          try {
            const parsed = JSON.parse(fullText) as { body?: string };
            if (typeof parsed.body === "string") saveText = parsed.body;
          } catch { /* not JSON */ }
        }
        await completeDraft(
          draftId,
          { text: saveText },
          "claude-opus-4-6",
          doneChunk.inputTokens + doneChunk.outputTokens,
        );

        await updateSessionStatus(sessionId, "completed").catch(() => {});

        // ── 9b. Quality check (non-blocking — don't delay SSE done event) ─
        let quality = null;
        try {
          quality = await checkQualityAsync(saveText, docTypeName, targetWords);
          const score = Math.round(
            (quality.toneScore + quality.specificityScore) / 2,
          ) as 1 | 2 | 3 | 4 | 5;
          await updateDraftQuality(draftId, score, quality as unknown as Record<string, unknown>).catch(() => {});
        } catch (qErr) {
          console.error("[generate] quality check failed (non-fatal):", qErr);
        }

        // ── Send done event ────────────────────────────────────────────────
        enqueue(sseEvent("done", {
          draftId,
          inputTokens:  doneChunk.inputTokens,
          outputTokens: doneChunk.outputTokens,
          firstTokenMs: doneChunk.firstTokenMs,
          totalMs:      doneChunk.totalMs,
          quality,
        }));

      } catch (err) {
        // ── 10. On error: refund credit ────────────────────────────────────
        const message = err instanceof Error ? err.message : String(err);
        console.error("[generate] stream error:", message);

        if (creditConsumed && !isUnlimited) {
          await refundCredit(userId).catch((e) =>
            console.error("[generate] refundCredit failed:", e),
          );
        }
        await updateSessionStatus(sessionId, "failed").catch(() => {});

        enqueue(sseError("stream_failed", message));
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
      ...rateLimitHeaders(rl),
    },
  });
}
