import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { anthropic } from "@/lib/anthropic";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_CHARS = 20_000;

const TRANSLATE_SYSTEM = `\
You are a professional Vietnamese translator specialising in academic and professional documents.

Rules:
1. Translate the entire document into formal Vietnamese (văn phong lịch sự, trang trọng).
2. Preserve all paragraph breaks and structural formatting.
3. Preserve proper nouns: institution names, programme names, award names stay in their original language unless a standard Vietnamese equivalent exists.
4. Numbers, dates, and scores are preserved exactly.
5. Do not add commentary, footnotes, or translator notes.
6. Output only the translation — no preamble, no markdown fences.\
`;

/**
 * POST /api/sessions/[id]/translate
 * Body: { text: string }
 * Returns: { translation: string }
 *
 * Translates a draft to Vietnamese using Claude Haiku.
 * Scoped to a session for auth; the text can be any draft revision.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit("general", userId, request);
  if (!rl.allowed) return rateLimitResponse(rl);

  const { id: sessionId } = await params;

  // Ownership check
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.user_id !== userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = (body as { text?: unknown }).text;
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 422 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `text must be ${MAX_CHARS.toLocaleString()} characters or fewer` },
      { status: 422 },
    );
  }

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: TRANSLATE_SYSTEM,
    messages: [{ role: "user", content: text.trim() }],
  });

  const raw = response.content[0];
  if (raw.type !== "text") {
    return NextResponse.json({ error: "Unexpected response from model" }, { status: 500 });
  }

  return NextResponse.json({ translation: raw.text.trim() });
}
