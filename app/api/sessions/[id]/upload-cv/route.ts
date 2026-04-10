import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PROMPT_REGISTRY } from "@/lib/prompts/registry";
import { SYSTEM_FIELDS } from "@/lib/session/field-meta";
import { extractFromCV } from "@/lib/ai/extract";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

// ---------------------------------------------------------------------------
// Basic PDF text extraction — no dependencies required.
// Works on PDFs with uncompressed text streams (Word exports, most CV tools).
// Returns empty string for image-only or compressed PDFs.
// ---------------------------------------------------------------------------
function extractPdfText(buffer: Buffer): string {
  // Decode as latin1 so every byte is preserved as a character
  const raw = buffer.toString("latin1");
  const parts: string[] = [];

  // Match Tj / ' / " operators (single string argument)
  const tjRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(?:Tj|T'|")/g;
  let m: RegExpExecArray | null;
  while ((m = tjRe.exec(raw)) !== null) {
    const s = decodePdfString(m[1]);
    if (s.trim()) parts.push(s.trim());
  }

  // Match TJ operator (array of strings and number kerning adjustments)
  const tjArrRe = /\[([^\]]*)\]\s*TJ/g;
  while ((m = tjArrRe.exec(raw)) !== null) {
    const inner = m[1];
    const strRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
    let sm: RegExpExecArray | null;
    while ((sm = strRe.exec(inner)) !== null) {
      const s = decodePdfString(sm[1]);
      if (s.trim()) parts.push(s.trim());
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function decodePdfString(s: string): string {
  return s
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\\\/g, "\\")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/[^\x20-\x7E]/g, " "); // strip non-ASCII
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  // Auth + ownership
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
  if (sessionResult.data.user_id !== userResult.data.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Parse multipart form data
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

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  // Extract text by file type
  const name = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isTxt = file.type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md");

  if (!isPdf && !isTxt) {
    return NextResponse.json({ error: "unsupported_format" }, { status: 422 });
  }

  let cvText: string;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isTxt) {
    cvText = buffer.toString("utf-8");
  } else {
    cvText = extractPdfText(buffer);
  }

  if (cvText.trim().length < 80) {
    // Likely a scanned/image PDF or encryption
    return NextResponse.json({ error: "could_not_read" }, { status: 422 });
  }

  // Resolve target fields from session's doc type
  const dt = sessionResult.data.document_types;
  const slug = (Array.isArray(dt) ? dt[0] : dt)?.slug as string | undefined;

  if (!slug || !(slug in PROMPT_REGISTRY)) {
    return NextResponse.json({ error: "Unknown document type" }, { status: 422 });
  }

  const template = PROMPT_REGISTRY[slug as keyof typeof PROMPT_REGISTRY];
  const targetFields = template.requiredFields.filter((f) => !SYSTEM_FIELDS.has(f));

  const result = await extractFromCV(cvText, targetFields);

  return NextResponse.json(result);
}
