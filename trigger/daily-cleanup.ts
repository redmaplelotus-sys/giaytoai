import { schedules } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { deleteFromR2 } from "@/lib/r2";

// ---------------------------------------------------------------------------
// Daily cleanup — runs at 4 AM UTC (11 AM Vietnam)
//
// 1. Delete expired R2 exports (> 7 days old)
// 2. Purge stripe_events older than 30 days
// 3. Mark abandoned sessions (pending > 7 days)
// ---------------------------------------------------------------------------

const EXPORT_TTL_DAYS   = 7;
const STRIPE_TTL_DAYS   = 30;
const ABANDON_DAYS      = 7;

export const dailyCleanup = schedules.task({
  id: "daily-cleanup",
  cron: "0 4 * * *", // 4 AM UTC daily
  run: async () => {
    const results = {
      r2Deleted: 0,
      r2Errors: 0,
      stripeEventsPurged: 0,
      sessionsAbandoned: 0,
    };

    // ── 1. Delete expired R2 exports ──────────────────────────────────────
    const exportCutoff = new Date(
      Date.now() - EXPORT_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: expiredExports } = await supabaseAdmin
      .from("exports")
      .select("id, r2_key")
      .lt("created_at", exportCutoff)
      .not("r2_key", "is", null)
      .limit(200);

    for (const exp of expiredExports ?? []) {
      if (!exp.r2_key) continue;
      try {
        await deleteFromR2(exp.r2_key);
        // Clear the r2_key so we don't try again
        await supabaseAdmin
          .from("exports")
          .update({ r2_key: null })
          .eq("id", exp.id);
        results.r2Deleted++;
      } catch (err) {
        console.error(`[daily-cleanup] R2 delete failed for ${exp.r2_key}:`, err);
        results.r2Errors++;
      }
    }

    // ── 2. Purge old stripe_events ────────────────────────────────────────
    const stripeCutoff = new Date(
      Date.now() - STRIPE_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { count: stripeDeleted, error: stripeErr } = await supabaseAdmin
      .from("stripe_events")
      .delete({ count: "exact" })
      .lt("created_at", stripeCutoff);

    if (stripeErr) {
      console.error("[daily-cleanup] stripe_events purge failed:", stripeErr);
    } else {
      results.stripeEventsPurged = stripeDeleted ?? 0;
    }

    // ── 3. Mark abandoned sessions ────────────────────────────────────────
    // Sessions stuck in "pending" for > 7 days with no drafts
    const abandonCutoff = new Date(
      Date.now() - ABANDON_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Find pending sessions older than cutoff that have no drafts
    const { data: staleSessionIds } = await supabaseAdmin
      .from("sessions")
      .select("id")
      .eq("status", "pending")
      .lt("created_at", abandonCutoff);

    if (staleSessionIds && staleSessionIds.length > 0) {
      // Filter to only those with zero drafts
      const ids = staleSessionIds.map((s) => s.id);

      const { data: sessionsWithDrafts } = await supabaseAdmin
        .from("drafts")
        .select("session_id")
        .in("session_id", ids);

      const hasDrafts = new Set((sessionsWithDrafts ?? []).map((d) => d.session_id));
      const abandoned = ids.filter((id) => !hasDrafts.has(id));

      if (abandoned.length > 0) {
        const { count } = await supabaseAdmin
          .from("sessions")
          .update({ status: "failed" }, { count: "exact" })
          .in("id", abandoned)
          .eq("status", "pending");

        results.sessionsAbandoned = count ?? 0;
      }
    }

    console.log("[daily-cleanup] results:", results);
    return results;
  },
});
