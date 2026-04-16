import { schedules } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Resend } from "resend";

// ---------------------------------------------------------------------------
// Job B: Hourly cron — find pending outcome emails where send_at <= now
// (sent_at is null = not yet sent), send via Resend, mark as sent.
//
// Table columns: id, session_id, user_id, resend_id, type, sent_at,
//                created_at, send_at
// ---------------------------------------------------------------------------

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@giaytoai.com";

export const sendOutcomeEmails = schedules.task({
  id: "send-outcome-emails",
  cron: "0 * * * *", // every hour
  run: async () => {
    // Find unsent emails ready to send (sent_at IS NULL = pending)
    const { data: emails, error } = await supabaseAdmin
      .from("outcome_emails")
      .select("id, user_id, session_id, type")
      .is("sent_at", null)
      .not("send_at", "is", null)
      .lte("send_at", new Date().toISOString())
      .limit(50);

    if (error) {
      console.error("[send-outcome-emails] query failed:", error);
      throw error;
    }

    if (!emails || emails.length === 0) {
      return { sent: 0 };
    }

    let sentCount = 0;

    for (const email of emails) {
      try {
        // Fetch user email
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("email, locale")
          .eq("clerk_id", email.user_id)
          .single();

        if (!user?.email) {
          // No email — mark as sent to skip permanently
          await supabaseAdmin
            .from("outcome_emails")
            .update({ sent_at: new Date().toISOString(), resend_id: "skipped_no_email" })
            .eq("id", email.id);
          continue;
        }

        // Fetch document type for context
        const { data: session } = await supabaseAdmin
          .from("sessions")
          .select("document_types(name_vi, name_en)")
          .eq("id", email.session_id)
          .single();

        const dt = Array.isArray(session?.document_types)
          ? session.document_types[0]
          : session?.document_types;
        const docTypeName = dt?.name_vi ?? dt?.name_en ?? "tài liệu";

        // Send email via Resend
        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to: user.email,
          subject: `Kết quả hồ sơ của bạn — ${docTypeName}`,
          html: buildOutcomeEmailHtml(docTypeName, email.session_id),
        });

        // Mark as sent with Resend message ID
        await supabaseAdmin
          .from("outcome_emails")
          .update({
            sent_at: new Date().toISOString(),
            resend_id: result.data?.id ?? "sent",
          })
          .eq("id", email.id);

        sentCount++;
      } catch (err) {
        console.error(`[send-outcome-emails] failed for ${email.id}:`, err);
        // Mark with error resend_id so we don't retry endlessly
        await supabaseAdmin
          .from("outcome_emails")
          .update({ resend_id: "error" })
          .eq("id", email.id);
      }
    }

    return { sent: sentCount, total: emails.length };
  },
});

// ---------------------------------------------------------------------------
// Email template
// ---------------------------------------------------------------------------

function buildOutcomeEmailHtml(docTypeName: string, sessionId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://giaytoai.com";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 20px;">
      <p style="font-size: 15px; color: #1B3A5C; line-height: 1.6;">
        Xin chào,
      </p>
      <p style="font-size: 15px; color: #444441; line-height: 1.6;">
        Khoảng 2 tháng trước, bạn đã sử dụng Giấy Tờ AI để tạo <strong>${docTypeName}</strong>.
        Chúng tôi rất muốn biết kết quả hồ sơ của bạn!
      </p>
      <p style="font-size: 15px; color: #444441; line-height: 1.6;">
        Phản hồi của bạn giúp chúng tôi cải thiện chất lượng tài liệu cho tất cả người dùng.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${appUrl}/feedback?session=${sessionId}"
           style="display: inline-block; background: #1B3A5C; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
          Chia sẻ kết quả
        </a>
      </div>
      <p style="font-size: 13px; color: #5F5E5A; line-height: 1.5;">
        Cảm ơn bạn đã sử dụng Giấy Tờ AI. Chúc bạn thành công!
      </p>
      <hr style="border: none; border-top: 1px solid #E8E8E4; margin: 24px 0;" />
      <p style="font-size: 11px; color: #999;">
        Giấy Tờ AI · Tài liệu quốc tế chuyên nghiệp<br>
        <a href="${appUrl}" style="color: #185FA5;">giaytoai.com</a>
      </p>
    </div>
  `;
}
