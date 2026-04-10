import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/drafts/[id]/quality
 *
 * Returns the quality report for a draft.
 * - 200 { quality_scores: QualityReport } when the Haiku check has completed.
 * - 200 { quality_scores: null }          while the check is still running.
 * - 404 if the draft does not exist or does not belong to the caller.
 *
 * Clients poll every 5 s and stop when quality_scores is non-null.
 * Cache-Control: no-store prevents intermediary caches from serving stale data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit("general", userId, request);
  if (!rl.allowed) return rateLimitResponse(rl);

  const { id: draftId } = await params;

  const { data, error } = await supabaseAdmin
    .from("drafts")
    .select("id, user_id, quality_data, quality_score")
    .eq("id", draftId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  if (data.user_id !== userId) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  const quality_scores = data.quality_data ?? null;

  return NextResponse.json(
    { quality_scores },
    { headers: { "Cache-Control": "no-store" } },
  );
}
