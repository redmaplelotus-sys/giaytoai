import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSession, saveAnswers, getUserSessions } from "@/lib/db/sessions";
import { PROMPT_REGISTRY, type DocTypeSlug } from "@/lib/prompts/registry";
import { OUTPUT_LANGUAGE_CODES } from "@/lib/prompts/compile";
import { getSignedUrl } from "@/lib/r2";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const DOC_TYPE_SLUGS = Object.keys(PROMPT_REGISTRY) as DocTypeSlug[];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EXPORT_TTL = 60 * 60; // 1 h — short because URLs are embedded in API responses

const FORMAT_FILENAME: Record<string, string> = {
  docx: "document.docx",
  html: "document.html",
  pdf:  "document.pdf",
};

type RawSession = Awaited<ReturnType<typeof getUserSessions>>[number];

type DocTypeRow = { slug: string; name_en: string; name_vi: string };
type DraftRow   = { id: string; created_at: string };
type ExportRow  = { id: string; format: string; r2_key: string | null; created_at: string };

/** Pick the newest row from a nested array (Supabase returns them unsorted). */
function latest<T extends { created_at: string }>(rows: T[]): T | null {
  if (!rows.length) return null;
  return rows.reduce((a, b) => (a.created_at >= b.created_at ? a : b));
}

async function toSessionItem(session: RawSession) {
  const answers   = (session.answers ?? {}) as Record<string, unknown>;
  const docType   = session.document_types as unknown as DocTypeRow | null;
  const drafts    = (session.drafts  as DraftRow[]  | null) ?? [];
  const exports_  = (session.exports as ExportRow[] | null) ?? [];

  const latestDraft  = latest(drafts);
  const latestExport = latest(exports_.filter((e) => !!e.r2_key));

  let exportItem: {
    id: string; format: string; url: string; filename: string; expires_at: string;
  } | null = null;

  if (latestExport?.r2_key) {
    try {
      const url      = await getSignedUrl(latestExport.r2_key, EXPORT_TTL);
      const filename = FORMAT_FILENAME[latestExport.format] ?? "document";
      exportItem = {
        id:         latestExport.id,
        format:     latestExport.format,
        url,
        filename,
        expires_at: new Date(Date.now() + EXPORT_TTL * 1000).toISOString(),
      };
    } catch {
      // Presign failure is non-fatal; export item is omitted
    }
  }

  return {
    id:            session.id,
    status:        session.status as "pending" | "processing" | "completed" | "failed",
    created_at:    session.created_at,
    document_type: docType ? {
      slug:    docType.slug,
      name_en: docType.name_en,
      name_vi: docType.name_vi,
    } : null,
    destination: typeof answers.destination === "string" ? answers.destination : null,
    goal:        typeof answers.goal        === "string" ? answers.goal        : null,
    draft:       latestDraft ? { id: latestDraft.id } : null,
    export:      exportItem,
  };
}

// ---------------------------------------------------------------------------
// GET /api/sessions
//
// Query params:
//   limit  — max rows to return (default 50, max 100)
//   offset — pagination offset (default 0)
//
// Returns:
//   { sessions: SessionItem[]; limit: number; offset: number }
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit("general", userId, request);
  if (!rl.allowed) return rateLimitResponse(rl);

  const sp     = request.nextUrl.searchParams;
  const limit  = Math.min(100, Math.max(1, parseInt(sp.get("limit")  ?? "50", 10) || 50));
  const offset = Math.max(0,              parseInt(sp.get("offset") ?? "0",  10) || 0);

  const rows    = await getUserSessions(userId, { limit, offset });
  const sessions = await Promise.all(rows.map(toSessionItem));

  return NextResponse.json({ sessions, limit, offset });
}

// ---------------------------------------------------------------------------
// POST /api/sessions
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, answers } = body as {
    slug: unknown;
    answers: Record<string, unknown>;
  };

  if (!DOC_TYPE_SLUGS.includes(slug as DocTypeSlug)) {
    return NextResponse.json(
      { error: `Invalid slug. Must be one of: ${DOC_TYPE_SLUGS.join(", ")}` },
      { status: 422 },
    );
  }

  const outputLang = String(answers?.output_language ?? "en");
  if (!OUTPUT_LANGUAGE_CODES.includes(outputLang as never)) {
    return NextResponse.json(
      {
        error: `Invalid output_language. Must be one of: ${OUTPUT_LANGUAGE_CODES.join(", ")}`,
      },
      { status: 422 },
    );
  }

  // Resolve doc type and user in parallel
  const [docTypeResult, userResult] = await Promise.all([
    supabaseAdmin
      .from("document_types")
      .select("id")
      .eq("slug", slug)
      .single(),
    supabaseAdmin
      .from("users")
      .select("id, credits_remaining, plan")
      .eq("clerk_id", userId)
      .single(),
  ]);

  if (docTypeResult.error || !docTypeResult.data) {
    return NextResponse.json({ error: "Document type not found" }, { status: 404 });
  }

  if (userResult.error || !userResult.data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { id: documentTypeId } = docTypeResult.data;
  const { id: internalUserId, credits_remaining, plan } = userResult.data;

  // Credit gate — unlimited plan bypasses the check
  if (plan !== "unlimited" && credits_remaining <= 0) {
    return NextResponse.json({ error: "no_credits" }, { status: 402 });
  }

  const session = await createSession(internalUserId, documentTypeId);
  await saveAnswers(session.id, answers);

  return NextResponse.json({ id: session.id }, { status: 201 });
}
