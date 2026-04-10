import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PROMPT_REGISTRY } from "@/lib/prompts/registry";
import { SYSTEM_FIELDS } from "@/lib/session/field-meta";
import { extractCVData } from "@/lib/ai/extract-cv";

const MAX_CV_CHARS = 12_000; // ~3,000 tokens — enough for a full CV

export async function POST(
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

  const cvText = (body as { cvText?: unknown }).cvText;
  if (typeof cvText !== "string" || !cvText.trim()) {
    return NextResponse.json({ error: "cvText is required" }, { status: 422 });
  }
  if (cvText.length > MAX_CV_CHARS) {
    return NextResponse.json(
      { error: `cvText must be ${MAX_CV_CHARS.toLocaleString()} characters or fewer` },
      { status: 422 },
    );
  }

  // Auth + ownership
  const { data: sessionData, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .select("user_id, document_types(slug)")
    .eq("id", sessionId)
    .single();

  if (sessionError || !sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (sessionData.user_id !== userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const dt = sessionData.document_types;
  const slug = (Array.isArray(dt) ? dt[0] : dt)?.slug as string | undefined;
  if (!slug || !(slug in PROMPT_REGISTRY)) {
    return NextResponse.json({ error: "Unknown document type" }, { status: 422 });
  }

  const template = PROMPT_REGISTRY[slug as keyof typeof PROMPT_REGISTRY];
  const targetFields = template.requiredFields.filter((f) => !SYSTEM_FIELDS.has(f));

  const { profile, prefilledAnswers, count } = await extractCVData(cvText, targetFields);

  return NextResponse.json({ extracted: prefilledAnswers, count, profile });
}
