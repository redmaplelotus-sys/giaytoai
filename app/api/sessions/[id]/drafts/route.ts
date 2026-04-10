import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/sessions/[id]/drafts
 * Returns all draft revisions for a session, oldest first (v1, v2, v3…).
 * Content is included so the client can populate the editor without a
 * second round-trip when switching revisions.
 */
// ---------------------------------------------------------------------------
// Shared ownership check
// ---------------------------------------------------------------------------

async function verifySession(sessionId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single();
  if (error || !data || data.user_id !== userId) return false;
  return true;
}

// ---------------------------------------------------------------------------
// GET /api/sessions/[id]/drafts
// Returns all draft revisions oldest-first (v1, v2, v3…).
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit("general", userId, request);
  if (!rl.allowed) return rateLimitResponse(rl);

  const { id: sessionId } = await params;

  if (!(await verifySession(sessionId, userId))) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("drafts")
    .select("id, content, model, tokens_used, quality_score, quality_data, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true }); // oldest first → v1, v2, v3

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ drafts: data ?? [] });
}

// ---------------------------------------------------------------------------
// POST /api/sessions/[id]/drafts
// Saves the current editor content as a new manual draft revision.
// Body: { text: string; html: string }
// Returns: { id: string; created_at: string }
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit("draft", userId, request);
  if (!rl.allowed) return rateLimitResponse(rl);

  const { id: sessionId } = await params;

  if (!(await verifySession(sessionId, userId))) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { text, html } = body as { text?: unknown; html?: unknown };

  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from("drafts")
    .insert({
      session_id: sessionId,
      user_id:    userId,
      content:    { text, html: typeof html === "string" ? html : text },
    })
    .select("id, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
