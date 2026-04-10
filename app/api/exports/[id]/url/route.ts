import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSignedUrl } from "@/lib/r2";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// GET /api/exports/[id]/url
//
// Generates a fresh 24-hour pre-signed download URL for an existing export.
// Returns: { url: string; filename: string; expiresAt: string }
// ---------------------------------------------------------------------------

const TTL_SECONDS = 60 * 60 * 24;

const FORMAT_FILENAME: Record<string, string> = {
  docx: "document.docx",
  html: "document.html",
  pdf:  "document.pdf",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit("general", userId, request);
  if (!rl.allowed) return rateLimitResponse(rl);

  const { id: exportId } = await params;

  const { data: exportRow, error } = await supabaseAdmin
    .from("exports")
    .select("r2_key, format")
    .eq("id", exportId)
    .eq("user_id", userId)
    .single();

  if (error || !exportRow) {
    return Response.json({ error: "Export not found" }, { status: 404 });
  }

  if (!exportRow.r2_key) {
    return Response.json({ error: "File not available" }, { status: 404 });
  }

  const url       = await getSignedUrl(exportRow.r2_key, TTL_SECONDS);
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();
  const filename  = FORMAT_FILENAME[exportRow.format] ?? "document";

  return Response.json({ url, filename, expiresAt });
}
