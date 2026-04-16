import { schedules } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Resend } from "resend";

// ---------------------------------------------------------------------------
// Weekly summary: every Monday 8 AM UTC (3 PM Vietnam).
// Computes key metrics for the past 7 days and emails the founder.
// ---------------------------------------------------------------------------

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL    = process.env.RESEND_FROM_EMAIL ?? "noreply@giaytoai.com";
const FOUNDER_EMAIL = "canseasolutions@gmail.com";

export const weeklySummary = schedules.task({
  id: "weekly-summary",
  cron: "0 8 * * 1", // Monday 8 AM UTC
  run: async () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // ── New users this week ─────────────────────────────────────────────
    const { count: newUsers } = await supabaseAdmin
      .from("users")
      .select("clerk_id", { count: "exact", head: true })
      .gte("created_at", weekAgo);

    // ── Total users ─────────────────────────────────────────────────────
    const { count: totalUsers } = await supabaseAdmin
      .from("users")
      .select("clerk_id", { count: "exact", head: true });

    // ── Documents generated this week ───────────────────────────────────
    const { count: docsGenerated } = await supabaseAdmin
      .from("drafts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo);

    // ── Documents exported this week ────────────────────────────────────
    const { count: docsExported } = await supabaseAdmin
      .from("exports")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo);

    // ── Export rate ──────────────────────────────────────────────────────
    const exportRate = (docsGenerated ?? 0) > 0
      ? ((docsExported ?? 0) / (docsGenerated ?? 1))
      : 0;

    // ── Average edit distance this week ─────────────────────────────────
    const { data: draftsWithEdits } = await supabaseAdmin
      .from("drafts")
      .select("quality_data")
      .gte("created_at", weekAgo)
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

    // ── Sessions completed vs failed ────────────────────────────────────
    const { count: sessionsCompleted } = await supabaseAdmin
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo)
      .eq("status", "completed");

    const { count: sessionsFailed } = await supabaseAdmin
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo)
      .eq("status", "failed");

    // ── Revenue (PayOS orders completed this week) ──────────────────────
    const { data: payosOrders } = await supabaseAdmin
      .from("payos_orders")
      .select("amount_vnd")
      .gte("paid_at", weekAgo)
      .eq("status", "completed");

    const revenueVnd = (payosOrders ?? []).reduce(
      (sum, o) => sum + ((o.amount_vnd as number) ?? 0), 0,
    );

    // ── Build metrics object ────────────────────────────────────────────
    const metrics = {
      newUsers:          newUsers ?? 0,
      totalUsers:        totalUsers ?? 0,
      docsGenerated:     docsGenerated ?? 0,
      docsExported:      docsExported ?? 0,
      exportRate:        Math.round(exportRate * 100),
      avgEditDistance:    avgEditDistance !== null ? Math.round(avgEditDistance * 100) : null,
      sessionsCompleted: sessionsCompleted ?? 0,
      sessionsFailed:    sessionsFailed ?? 0,
      revenueVnd,
    };

    // ── Format and send email ───────────────────────────────────────────
    const weekLabel = `${formatDate(new Date(weekAgo))} — ${formatDate(now)}`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: FOUNDER_EMAIL,
      subject: `📊 Giấy Tờ AI — Báo cáo tuần ${formatDate(now)}`,
      html: buildSummaryHtml(weekLabel, metrics),
    });

    return metrics;
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function buildSummaryHtml(
  weekLabel: string,
  m: {
    newUsers: number;
    totalUsers: number;
    docsGenerated: number;
    docsExported: number;
    exportRate: number;
    avgEditDistance: number | null;
    sessionsCompleted: number;
    sessionsFailed: number;
    revenueVnd: number;
  },
): string {
  const rows = [
    ["Người dùng mới",        String(m.newUsers)],
    ["Tổng người dùng",       String(m.totalUsers)],
    ["Tài liệu tạo",         String(m.docsGenerated)],
    ["Tài liệu xuất",        String(m.docsExported)],
    ["Tỉ lệ xuất",           `${m.exportRate}%`],
    ["Độ tương đồng TB",     m.avgEditDistance !== null ? `${m.avgEditDistance}%` : "—"],
    ["Sessions hoàn thành",   String(m.sessionsCompleted)],
    ["Sessions thất bại",     String(m.sessionsFailed)],
    ["Doanh thu VND",         m.revenueVnd > 0 ? `${m.revenueVnd.toLocaleString("vi-VN")}₫` : "0₫"],
  ];

  const tableRows = rows
    .map(([label, value]) =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #E8E8E4;font-size:14px;color:#5F5E5A;">${label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E8E8E4;font-size:14px;font-weight:600;color:#1B3A5C;text-align:right;">${value}</td>
      </tr>`)
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
      <h1 style="font-size:20px;font-weight:700;color:#1B3A5C;margin:0 0 4px;">
        📊 Báo cáo tuần
      </h1>
      <p style="font-size:13px;color:#5F5E5A;margin:0 0 24px;">${weekLabel}</p>

      <table style="width:100%;border-collapse:collapse;border:1px solid #E8E8E4;border-radius:8px;">
        ${tableRows}
      </table>

      ${m.avgEditDistance !== null && m.avgEditDistance < 82
        ? `<p style="margin:16px 0 0;padding:10px 14px;background:#FEF8EE;border:1px solid #FAC775;border-radius:8px;font-size:13px;color:#854F0B;">
            ⚠ Độ tương đồng trung bình dưới 82% — xem xét cải thiện prompt.
          </p>`
        : ""}

      ${m.sessionsFailed > 0
        ? `<p style="margin:8px 0 0;padding:10px 14px;background:#FEF2F2;border:1px solid #F0B8B8;border-radius:8px;font-size:13px;color:#B91C1C;">
            ⚠ ${m.sessionsFailed} session thất bại tuần này.
          </p>`
        : ""}

      <hr style="border:none;border-top:1px solid #E8E8E4;margin:24px 0;" />
      <p style="font-size:11px;color:#999;">
        Giấy Tờ AI · Báo cáo tự động hàng tuần
      </p>
    </div>
  `;
}
