import { task } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ---------------------------------------------------------------------------
// Job: On draft download, compare original AI-generated text vs the final
// editor text. Compute similarity score. Flag heavily edited drafts for
// prompt review.
//
// Triggered from onDraftDownloaded() in lib/events.ts
// ---------------------------------------------------------------------------

export interface TrackDraftEditsPayload {
  userId: string;
  draftId: string;
  sessionId: string;
  finalText: string;
}

/** Threshold below which the draft is flagged for prompt review. */
const HEAVY_EDIT_THRESHOLD = 0.6; // 60% similarity

export const trackDraftEdits = task({
  id: "track-draft-edits",
  run: async (payload: TrackDraftEditsPayload) => {
    // Fetch original AI-generated text from the draft
    const { data: draft } = await supabaseAdmin
      .from("drafts")
      .select("content")
      .eq("id", payload.draftId)
      .single();

    const originalText = (draft?.content as { text?: string } | null)?.text ?? "";
    if (!originalText || !payload.finalText) {
      return { skipped: true, reason: "missing text" };
    }

    // Compute similarity
    const similarity = computeSimilarity(originalText, payload.finalText);
    const heavilyEdited = similarity < HEAVY_EDIT_THRESHOLD;

    // Save to draft quality_data
    const { data: existing } = await supabaseAdmin
      .from("drafts")
      .select("quality_data")
      .eq("id", payload.draftId)
      .single();

    const qualityData = (existing?.quality_data ?? {}) as Record<string, unknown>;
    const merged = {
      ...qualityData,
      editTracking: {
        similarity: Math.round(similarity * 100) / 100,
        heavilyEdited,
        originalLength: originalText.length,
        finalLength: payload.finalText.length,
        trackedAt: new Date().toISOString(),
      },
    };

    await supabaseAdmin
      .from("drafts")
      .update({ quality_data: merged })
      .eq("id", payload.draftId);

    // If heavily edited, log for prompt review
    if (heavilyEdited) {
      console.warn(
        `[track-draft-edits] FLAGGED: draft ${payload.draftId} similarity=${similarity.toFixed(2)} — needs prompt review`,
      );

      // Fetch session info for context
      const { data: session } = await supabaseAdmin
        .from("sessions")
        .select("document_types(slug)")
        .eq("id", payload.sessionId)
        .single();

      const dt = Array.isArray(session?.document_types)
        ? session.document_types[0]
        : session?.document_types;

      await supabaseAdmin
        .from("prompt_review_flags")
        .upsert({
          draft_id: payload.draftId,
          session_id: payload.sessionId,
          user_id: payload.userId,
          doc_type_slug: dt?.slug ?? "unknown",
          similarity,
          flagged_at: new Date().toISOString(),
        }, { onConflict: "draft_id" })
        .then(({ error }) => {
          // Table may not exist yet — non-fatal
          if (error) console.warn("[track-draft-edits] prompt_review_flags insert skipped:", error.message);
        });
    }

    return { similarity, heavilyEdited };
  },
});

// ---------------------------------------------------------------------------
// Similarity computation — sequence matcher (similar to Python difflib)
//
// Uses longest common subsequence ratio:
//   similarity = 2 * LCS_length / (len(a) + len(b))
//
// Operates on words, not characters, for meaningful document comparison.
// ---------------------------------------------------------------------------

function computeSimilarity(a: string, b: string): number {
  const wordsA = tokenize(a);
  const wordsB = tokenize(b);

  if (wordsA.length === 0 && wordsB.length === 0) return 1;
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const lcsLen = lcsLength(wordsA, wordsB);
  return (2 * lcsLen) / (wordsA.length + wordsB.length);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * LCS length via Hunt-Szymanski for large texts.
 * Falls back to DP for short texts (< 500 words).
 */
function lcsLength(a: string[], b: string[]): number {
  // For short texts, use simple DP
  if (a.length * b.length < 250_000) {
    return lcsDp(a, b);
  }
  // For longer texts, sample to keep it fast
  const sampleRate = Math.ceil(a.length / 500);
  const sampledA = a.filter((_, i) => i % sampleRate === 0);
  const sampledB = b.filter((_, i) => i % sampleRate === 0);
  const sampled = lcsDp(sampledA, sampledB);
  return Math.round(sampled * sampleRate);
}

function lcsDp(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  // Space-optimized: two rows
  let prev = new Array<number>(n + 1).fill(0);
  let curr = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }

  return prev[n];
}
