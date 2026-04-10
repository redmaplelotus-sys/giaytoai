import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { PROMPT_REGISTRY } from "@/lib/prompts/registry";
import { SYSTEM_FIELDS } from "@/lib/session/field-meta";
import { extractCVData } from "@/lib/ai/extract-cv";
import { extractText } from "@/lib/extract-text";
import { uploadToR2, r2Key } from "@/lib/r2";

// ---------------------------------------------------------------------------
// Route segment config — Vercel serverless function limits.
// Memory (1024 MB) is set in vercel.json; maxDuration covers the 60 s cap.
// ---------------------------------------------------------------------------
export const maxDuration = 60;

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME: Record<string, string> = {
  ".pdf":  "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt":  "text/plain",
  ".md":   "text/markdown",
};

function resolveContentType(filename: string, declared: string): string | null {
  const ext = ("." + filename.toLowerCase().split(".").pop()) as keyof typeof ALLOWED_MIME;
  return ALLOWED_MIME[ext] ?? (declared.startsWith("text/") ? declared : null);
}

// ---------------------------------------------------------------------------
// POST /api/sessions/[id]/upload-cv
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  const rl = await checkRateLimit("upload", userId, request);
  if (!rl.allowed) return rateLimitResponse(rl);

  // ── Auth + ownership ──────────────────────────────────────────────────────
  const [userResult, sessionResult] = await Promise.all([
    supabaseAdmin.from("users").select("id").eq("clerk_id", userId).single(),
    supabaseAdmin
      .from("sessions")
      .select("user_id, document_types(slug)")
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

  // ── Parse form data ───────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field is required" }, { status: 422 });
  }

  // ── Validate size ─────────────────────────────────────────────────────────
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  // ── Validate type ─────────────────────────────────────────────────────────
  const contentType = resolveContentType(file.name, file.type);
  if (!contentType) {
    return NextResponse.json({ error: "unsupported_format" }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // ── Store to R2 ───────────────────────────────────────────────────────────
  const key = r2Key("uploads", userId, sessionId, file.name);
  let r2Error: Error | null = null;

  try {
    await uploadToR2(key, buffer, contentType);
  } catch (err) {
    // R2 failure is non-fatal — we still extract and return data.
    // The upload record will be omitted if storage failed.
    r2Error = err instanceof Error ? err : new Error(String(err));
    console.error("[upload-cv] R2 put failed:", r2Error.message);
  }

  // ── Save upload record (only when R2 succeeded) ───────────────────────────
  let uploadId: string | null = null;
  if (!r2Error) {
    const { data: uploadRow, error: uploadErr } = await supabaseAdmin
      .from("uploads")
      .insert({
        session_id: sessionId,
        user_id:    userId,
        r2_key:     key,
        filename:   file.name,
        mime_type:  contentType,
        size_bytes: file.size,
      })
      .select("id")
      .single();

    if (uploadErr) {
      console.error("[upload-cv] DB insert failed:", uploadErr.message);
    } else {
      uploadId = uploadRow.id as string;
    }
  }

  // ── Extract text ──────────────────────────────────────────────────────────
  let cvText: string;
  try {
    const extracted = await extractText(buffer, file.name);
    cvText = extracted.text;
  } catch (err) {
    console.error("[upload-cv] extractText failed:", err);
    return NextResponse.json({ error: "could_not_read" }, { status: 422 });
  }

  if (cvText.trim().length < 80) {
    return NextResponse.json({ error: "could_not_read" }, { status: 422 });
  }

  // ── Resolve target fields from session's doc type ─────────────────────────
  const dt = sessionResult.data.document_types;
  const slug = (Array.isArray(dt) ? dt[0] : dt)?.slug as string | undefined;

  if (!slug || !(slug in PROMPT_REGISTRY)) {
    return NextResponse.json({ error: "Unknown document type" }, { status: 422 });
  }

  const template = PROMPT_REGISTRY[slug as keyof typeof PROMPT_REGISTRY];
  const targetFields = template.requiredFields.filter((f) => !SYSTEM_FIELDS.has(f));

  // ── Run CV extraction ─────────────────────────────────────────────────────
  const { profile, prefilledAnswers, count } = await extractCVData(cvText, targetFields);

  return NextResponse.json({
    /** Flat answer map — consumed by CvDropZone → AnswersForm.handleExtracted() */
    extracted: prefilledAnswers,
    count,
    /** Structured profile — available for a "what we found" summary card */
    profile,
    /** R2 upload record id, null when storage was skipped due to an error */
    uploadId,
  });
}
