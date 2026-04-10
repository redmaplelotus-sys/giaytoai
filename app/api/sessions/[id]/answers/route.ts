import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incoming = (body as { answers?: unknown }).answers;
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return NextResponse.json({ error: "answers must be an object" }, { status: 422 });
  }

  const { data: sessionData, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .select("user_id, answers")
    .eq("id", sessionId)
    .single();

  if (sessionError || !sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (sessionData.user_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Merge: keep existing answers, overwrite only provided keys
  const merged = {
    ...(sessionData.answers as Record<string, unknown> ?? {}),
    ...(incoming as Record<string, unknown>),
  };

  const { error } = await supabaseAdmin
    .from("sessions")
    .update({ answers: merged })
    .eq("id", sessionId);

  if (error) {
    console.error("[sessions/[id]/answers PATCH]", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
