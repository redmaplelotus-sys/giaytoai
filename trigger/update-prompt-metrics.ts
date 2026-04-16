import { schedules } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ---------------------------------------------------------------------------
// Daily cron: compute metrics for each prompt_version, auto-promote the
// best-performing version per document type when thresholds are met.
//
// Metrics computed from drafts linked via prompt_version_id:
//   - sessions_count: total drafts using this version
//   - avg_edit_distance: average similarity from quality_data.editTracking
//   - acceptance_rate: fraction of drafts that were exported (downloaded)
//
// Auto-promote thresholds:
//   - sessions >= 50
//   - avg_edit_distance > 0.82
//   - acceptance_rate > 0.65
// ---------------------------------------------------------------------------

const MIN_SESSIONS       = 50;
const MIN_EDIT_DISTANCE  = 0.82;
const MIN_ACCEPTANCE     = 0.65;

interface PromptMetrics {
  sessionsCount: number;
  avgEditDistance: number | null;
  acceptanceRate: number;
  computedAt: string;
}

export const updatePromptMetrics = schedules.task({
  id: "update-prompt-metrics",
  cron: "0 3 * * *", // daily at 3 AM UTC
  run: async () => {
    // Fetch all prompt versions
    const { data: versions, error: vErr } = await supabaseAdmin
      .from("prompt_versions")
      .select("id, document_type_id, version, is_active");

    if (vErr || !versions) {
      console.error("[update-prompt-metrics] failed to fetch versions:", vErr);
      throw vErr;
    }

    const results: Array<{ id: string; metrics: PromptMetrics; promoted: boolean }> = [];

    // Group by document_type_id for promotion decisions
    const byDocType = new Map<string, typeof versions>();
    for (const v of versions) {
      const group = byDocType.get(v.document_type_id) ?? [];
      group.push(v);
      byDocType.set(v.document_type_id, group);
    }

    // Compute metrics for each version
    for (const v of versions) {
      // Count total drafts for this version
      const { count: sessionsCount } = await supabaseAdmin
        .from("drafts")
        .select("id", { count: "exact", head: true })
        .eq("prompt_version_id", v.id);

      const total = sessionsCount ?? 0;

      // Count exported drafts (have at least one export)
      const { data: exportedDrafts } = await supabaseAdmin
        .from("drafts")
        .select("id")
        .eq("prompt_version_id", v.id)
        .not("id", "is", null);

      // Get draft IDs to check exports
      const draftIds = exportedDrafts?.map((d) => d.id) ?? [];
      let exportedCount = 0;

      if (draftIds.length > 0) {
        const { count } = await supabaseAdmin
          .from("exports")
          .select("draft_id", { count: "exact", head: true })
          .in("draft_id", draftIds);
        exportedCount = count ?? 0;
      }

      // Compute average edit distance from quality_data.editTracking.similarity
      const { data: draftsWithEdits } = await supabaseAdmin
        .from("drafts")
        .select("quality_data")
        .eq("prompt_version_id", v.id)
        .not("quality_data", "is", null);

      const editDistances: number[] = [];
      for (const d of draftsWithEdits ?? []) {
        const qd = d.quality_data as Record<string, unknown> | null;
        const tracking = qd?.editTracking as { similarity?: number } | undefined;
        if (typeof tracking?.similarity === "number") {
          editDistances.push(tracking.similarity);
        }
      }

      const avgEditDistance = editDistances.length > 0
        ? editDistances.reduce((a, b) => a + b, 0) / editDistances.length
        : null;

      const acceptanceRate = total > 0 ? exportedCount / total : 0;

      const metrics: PromptMetrics = {
        sessionsCount: total,
        avgEditDistance: avgEditDistance !== null
          ? Math.round(avgEditDistance * 1000) / 1000
          : null,
        acceptanceRate: Math.round(acceptanceRate * 1000) / 1000,
        computedAt: new Date().toISOString(),
      };

      // Save metrics to prompt_versions (store in a metrics JSONB-like approach
      // using system_prompt field comment — but cleaner to use the user_prompt_template
      // Actually, update the row directly. We'll store in a way the table supports.)
      // Since there's no metrics column, we'll use supabase RPC or just log for now
      // and handle promotion logic here.

      results.push({ id: v.id, metrics, promoted: false });
    }

    // Auto-promotion: for each document type, check if any non-active version
    // meets all thresholds and outperforms the current active version
    for (const [docTypeId, group] of byDocType) {
      const currentActive = group.find((v) => v.is_active);
      const candidates = results.filter((r) =>
        group.some((v) => v.id === r.id && !v.is_active) &&
        r.metrics.sessionsCount >= MIN_SESSIONS &&
        r.metrics.avgEditDistance !== null &&
        r.metrics.avgEditDistance > MIN_EDIT_DISTANCE &&
        r.metrics.acceptanceRate > MIN_ACCEPTANCE,
      );

      if (candidates.length === 0) continue;

      // Pick the best candidate by composite score
      const best = candidates.reduce((a, b) => {
        const scoreA = (a.metrics.avgEditDistance ?? 0) * 0.6 + a.metrics.acceptanceRate * 0.4;
        const scoreB = (b.metrics.avgEditDistance ?? 0) * 0.6 + b.metrics.acceptanceRate * 0.4;
        return scoreB > scoreA ? b : a;
      });

      // Check if it outperforms the current active version
      const activeMetrics = currentActive
        ? results.find((r) => r.id === currentActive.id)?.metrics
        : null;

      const bestScore = (best.metrics.avgEditDistance ?? 0) * 0.6 + best.metrics.acceptanceRate * 0.4;
      const activeScore = activeMetrics
        ? (activeMetrics.avgEditDistance ?? 0) * 0.6 + activeMetrics.acceptanceRate * 0.4
        : 0;

      if (bestScore > activeScore) {
        // Demote current active
        if (currentActive) {
          await supabaseAdmin
            .from("prompt_versions")
            .update({ is_active: false })
            .eq("id", currentActive.id);
        }

        // Promote best candidate
        await supabaseAdmin
          .from("prompt_versions")
          .update({ is_active: true })
          .eq("id", best.id);

        best.promoted = true;

        console.log(
          `[update-prompt-metrics] PROMOTED version ${best.id} for doc_type ${docTypeId}` +
          ` — sessions=${best.metrics.sessionsCount}` +
          ` edit=${best.metrics.avgEditDistance}` +
          ` acceptance=${best.metrics.acceptanceRate}`,
        );
      }
    }

    const promoted = results.filter((r) => r.promoted);
    return {
      versionsEvaluated: results.length,
      promoted: promoted.map((r) => r.id),
      metrics: Object.fromEntries(results.map((r) => [r.id, r.metrics])),
    };
  },
});
