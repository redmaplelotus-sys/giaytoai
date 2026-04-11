import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { getSupabaseForUser } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateFeedback, type FeedbackInsight } from "@/lib/claude/feedback";

// ---------------------------------------------------------------------------
// Parse Claude's own --- notes section into FeedbackInsight warning items
// ---------------------------------------------------------------------------
function parseClaudeNotes(notesText: string): FeedbackInsight[] {
  if (!notesText.trim()) return [];
  return notesText
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 10)
    .map((note) => ({
      id: crypto.randomUUID(),
      type: "note" as const,
      title: "Ghi chú từ AI",
      body: note,
      actionable: false,
    }));
}

export const maxDuration = 30;
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/drafts/[id]/feedback
//
// Returns cached FeedbackInsight[] from quality_data.feedbackInsights,
// or generates + caches them if absent.
// Auth: Clerk. Ownership enforced via Supabase RLS.
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: draftId } = await params;

  // ── Ownership check via user-scoped client (honours RLS) ──────────────────
  const token = await getToken({ template: "supabase" });
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseForUser(token);

  const { data: draft, error: draftErr } = await supabase
    .from("drafts")
    .select(
      "id, content, quality_data, session_id, sessions(answers, document_types(slug))",
    )
    .eq("id", draftId)
    .single();

  if (draftErr || !draft) {
    return Response.json({ error: "Draft not found" }, { status: 404 });
  }

  // ── Return cached feedback if available ───────────────────────────────────
  const qualityData = (draft.quality_data ?? {}) as Record<string, unknown>;
  if (Array.isArray(qualityData.feedbackInsights)) {
    return Response.json({ insights: qualityData.feedbackInsights });
  }

  // ── Build inputs for generation ───────────────────────────────────────────
  const session = Array.isArray(draft.sessions)
    ? draft.sessions[0]
    : draft.sessions;
  const answers = (session?.answers ?? {}) as Record<string, string>;
  const dt = Array.isArray(session?.document_types)
    ? session.document_types[0]
    : session?.document_types;
  const docTypeSlug = String(dt?.slug ?? "");
  const destination = String(
    answers.destination ?? answers.target_country ?? answers.goal ?? "",
  );
  const content = draft.content as { text?: string; notes?: string } | null;
  const documentContent = content?.text ?? "";
  const claudeNotes     = content?.notes ?? "";

  if (!documentContent.trim()) {
    return Response.json({ insights: [] });
  }

  // ── Parse Claude's own notes (--- section) into warning insights ──────────
  const noteInsights = parseClaudeNotes(claudeNotes);

  // ── Generate AI feedback via Haiku ────────────────────────────────────────
  const aiInsights = await generateFeedback({
    documentContent,
    docTypeSlug,
    destination,
    answersVi: answers,
  });

  // Claude's own notes come first so users see them immediately
  const insights = [...noteInsights, ...aiInsights];

  // ── Cache in quality_data.feedbackInsights (merge with existing data) ─────
  const merged = { ...qualityData, feedbackInsights: insights };
  void supabaseAdmin
    .from("drafts")
    .update({ quality_data: merged })
    .eq("id", draftId)
    .then(({ error }) => { if (error) console.error("[feedback] cache save failed:", error); });

  return Response.json({ insights });
}
