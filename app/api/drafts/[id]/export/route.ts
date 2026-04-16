import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { getSupabaseForUser } from "@/lib/supabase";
import { uploadToR2, getSignedUrl, r2Key } from "@/lib/r2";
import { saveExport } from "@/lib/db/exports";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { documentCss } from "@/lib/document-styles";
import { buildDocx, buildBilingualDocx } from "@/lib/build-docx";
import { onDraftExported, onDraftDownloaded } from "@/lib/events";

export const maxDuration = 30;
export const dynamic    = "force-dynamic";

// ---------------------------------------------------------------------------
// Vercel memory override (1 GB) — DOCX generation can be memory-heavy
// ---------------------------------------------------------------------------
// Declared in vercel.json:
//   "functions": { "app/api/drafts/[id]/export/route.ts": { "memory": 1024 } }

// ---------------------------------------------------------------------------
// POST /api/drafts/[id]/export
//
// Body:    { format: "docx"|"html"|"bilingual", htmlContent: string, vietnameseText?: string }
// Returns: { url: string; filename: string; expiresAt: string }
//          url   — 24-hour pre-signed R2 GET URL
//          expiresAt — ISO-8601 timestamp when the URL expires
// ---------------------------------------------------------------------------

const VALID_FORMATS = ["docx", "html", "bilingual"] as const;
type ExportFormat   = typeof VALID_FORMATS[number];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { userId, getToken } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit("general", userId, request);
  if (!rl.allowed) return rateLimitResponse(rl);

  const { id: draftId } = await params;

  // ── Ownership via user-scoped client (honours RLS) ────────────────────────
  const token    = await getToken({ template: "supabase" });
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseForUser(token);

  const { data: draft, error: draftErr } = await supabase
    .from("drafts")
    .select("id, session_id, sessions(answers)")
    .eq("id", draftId)
    .single();

  if (draftErr || !draft) {
    return Response.json({ error: "Draft not found" }, { status: 404 });
  }

  const sessionAnswers = (
    Array.isArray(draft.sessions) ? draft.sessions[0] : draft.sessions
  )?.answers as Record<string, unknown> | undefined ?? {};

  const authorName = (
    sessionAnswers.full_name ??
    sessionAnswers.applicant_name ??
    sessionAnswers.name ??
    ""
  ) as string;

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { format, htmlContent, vietnameseText } =
    body as { format?: string; htmlContent?: string; vietnameseText?: string };

  if (!format || !(VALID_FORMATS as readonly string[]).includes(format)) {
    return Response.json({ error: "Invalid format. Must be one of: " + VALID_FORMATS.join(", ") }, { status: 422 });
  }
  if (typeof htmlContent !== "string" || !htmlContent.trim()) {
    return Response.json({ error: "htmlContent is required" }, { status: 422 });
  }
  if (format === "bilingual" && (typeof vietnameseText !== "string" || !vietnameseText.trim())) {
    return Response.json({ error: "vietnameseText is required for bilingual export" }, { status: 422 });
  }

  const exportFormat = format as ExportFormat;

  // ── Build file ────────────────────────────────────────────────────────────
  let fileBuffer:  Buffer;
  let contentType: string;
  let filename:    string;

  if (exportFormat === "docx") {
    fileBuffer  = await buildDocx(htmlContent, { authorName, title: "Document" });
    contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    filename    = "document.docx";
  } else if (exportFormat === "bilingual") {
    fileBuffer  = await buildBilingualDocx(htmlContent, vietnameseText!, { authorName, title: "Document — Bilingual" });
    contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    filename    = "document-bilingual.docx";
  } else {
    fileBuffer  = Buffer.from(buildStandaloneHtml(htmlContent), "utf-8");
    contentType = "text/html; charset=utf-8";
    filename    = "document.html";
  }

  // ── Upload to R2 ─────────────────────────────────────────────────────────
  const key = r2Key("exports", userId, draft.session_id, filename);

  await uploadToR2(key, fileBuffer, contentType, {
    "x-draft-id":   draftId,
    "x-user-id":    userId,
    "x-format":     exportFormat,
  });

  // ── Pre-signed 24-hour download URL ──────────────────────────────────────
  const TTL_SECONDS = 60 * 60 * 24;
  const url         = await getSignedUrl(key, TTL_SECONDS);
  const expiresAt   = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();

  // ── Save export record ────────────────────────────────────────────────────
  const dbFormat = exportFormat === "bilingual" ? "docx" : exportFormat;
  await saveExport(draftId, draft.session_id, userId, dbFormat, key);

  // ── Fire domain events (non-blocking) ────────────────────────────────────
  // Strip HTML tags to get plain text for edit tracking
  const finalText = htmlContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  void onDraftDownloaded({ userId, draftId, sessionId: draft.session_id, format: exportFormat, finalText });
  void onDraftExported({
    userId,
    draftId,
    sessionId:     draft.session_id,
    format:        exportFormat,
    fileSizeBytes: fileBuffer.byteLength,
    r2Key:         key,
  });

  return Response.json({ url, filename, expiresAt });
}

// ---------------------------------------------------------------------------
// HTML helper
// ---------------------------------------------------------------------------

function buildStandaloneHtml(body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Document</title>
  <style>${documentCss("both")}</style>
</head>
<body>${body}</body>
</html>`;
}
