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

  // Verify ownership: resolve clerk_id → user UUID, check session.user_id
  const [userResult, sessionResult] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single(),
    supabaseAdmin
      .from("sessions")
      .select("user_id, answers")
      .eq("id", sessionId)
      .single(),
  ]);

  if (userResult.error || !userResult.data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (sessionResult.error || !sessionResult.data) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (sessionResult.data.user_id !== userResult.data.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Merge: keep existing answers, overwrite only provided keys
  const merged = {
    ...(sessionResult.data.answers as Record<string, unknown> ?? {}),
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
