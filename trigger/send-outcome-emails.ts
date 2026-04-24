import { schedules } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";

// ---------------------------------------------------------------------------
// Job B: Hourly cron — find pending outcome emails where send_at <= now
// (sent_at is null = not yet sent), send via Resend, mark as sent.
//
// Table columns: id, session_id, user_id, resend_id, type, sent_at,
//                created_at, send_at
// ---------------------------------------------------------------------------


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
        // Fetch user email and locale
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("email, locale")
          .eq("clerk_id", email.user_id)
          .single();

        if (!user?.email) {
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
        const docNameVi = dt?.name_vi ?? "tài liệu";
        const docNameEn = dt?.name_en ?? "document";

        const locale = user.locale ?? "vi";
        const isEn = locale === "en";

        const subject = isEn
          ? `How did your application go? — ${docNameEn}`
          : `Kết quả hồ sơ của bạn — ${docNameVi}`;

        const html = isEn
          ? buildEnglishEmail(docNameEn, email.session_id, email.id)
          : buildVietnameseEmail(docNameVi, email.session_id, email.id);

        const result = await getResend().emails.send({
          from: FROM_EMAIL,
          to: user.email,
          subject,
          html,
        });

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
// Shared
// ---------------------------------------------------------------------------

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://giaytoai.com";

type Outcome = "accepted" | "pending" | "rejected" | "changed_plans";

function outcomeUrl(emailId: string, outcome: Outcome): string {
  return `${APP_URL}/api/outcome?id=${emailId}&outcome=${outcome}`;
}

function outcomeButtons(emailId: string, labels: Record<Outcome, { text: string; emoji: string }>): string {
  const btnStyle = (bg: string, border: string) =>
    `display:inline-block;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;border:2px solid ${border};background:${bg};color:#1B3A5C;margin:4px;`;

  return `
    <div style="text-align:center;margin:24px 0;">
      <a href="${outcomeUrl(emailId, "accepted")}" style="${btnStyle("#EAF3DE", "#C0DD97")}">
        ${labels.accepted.emoji} ${labels.accepted.text}
      </a>
      <a href="${outcomeUrl(emailId, "pending")}" style="${btnStyle("#E6F1FB", "#B5D4F4")}">
        ${labels.pending.emoji} ${labels.pending.text}
      </a>
      <br/>
      <a href="${outcomeUrl(emailId, "rejected")}" style="${btnStyle("#FEF8EE", "#FAC775")}">
        ${labels.rejected.emoji} ${labels.rejected.text}
      </a>
      <a href="${outcomeUrl(emailId, "changed_plans")}" style="${btnStyle("#F7F7F5", "#D4D4CE")}">
        ${labels.changed_plans.emoji} ${labels.changed_plans.text}
      </a>
    </div>
  `;
}

function footer(): string {
  return `
    <hr style="border:none;border-top:1px solid #E8E8E4;margin:24px 0;" />
    <p style="font-size:11px;color:#999;">
      Giấy Tờ AI · Tài liệu quốc tế chuyên nghiệp<br>
      <a href="${APP_URL}" style="color:#185FA5;">giaytoai.com</a>
    </p>
  `;
}

// ---------------------------------------------------------------------------
// Vietnamese template
// ---------------------------------------------------------------------------

function buildVietnameseEmail(docTypeName: string, _sessionId: string, emailId: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
      <p style="font-size:15px;color:#1B3A5C;line-height:1.6;">
        Xin chào,
      </p>
      <p style="font-size:15px;color:#444441;line-height:1.6;">
        Khoảng 2 tháng trước, bạn đã sử dụng Giấy Tờ AI để tạo <strong>${docTypeName}</strong>.
        Chúng tôi rất muốn biết kết quả hồ sơ của bạn!
      </p>
      <p style="font-size:14px;color:#5F5E5A;line-height:1.5;">
        Chỉ cần nhấn một nút bên dưới — không cần đăng nhập:
      </p>

      ${outcomeButtons(emailId, {
        accepted:      { text: "Đã được chấp nhận", emoji: "🎉" },
        pending:       { text: "Đang chờ kết quả",  emoji: "⏳" },
        rejected:      { text: "Bị từ chối",        emoji: "😔" },
        changed_plans: { text: "Đã thay đổi kế hoạch", emoji: "🔄" },
      })}

      <p style="font-size:13px;color:#5F5E5A;line-height:1.5;">
        Phản hồi của bạn giúp chúng tôi cải thiện chất lượng tài liệu cho tất cả người dùng.
        Cảm ơn bạn!
      </p>
      ${footer()}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// English template
// ---------------------------------------------------------------------------

function buildEnglishEmail(docTypeName: string, _sessionId: string, emailId: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
      <p style="font-size:15px;color:#1B3A5C;line-height:1.6;">
        Hi there,
      </p>
      <p style="font-size:15px;color:#444441;line-height:1.6;">
        About 2 months ago, you used Giấy Tờ AI to create a <strong>${docTypeName}</strong>.
        We'd love to know how your application went!
      </p>
      <p style="font-size:14px;color:#5F5E5A;line-height:1.5;">
        Just tap one button below — no login required:
      </p>

      ${outcomeButtons(emailId, {
        accepted:      { text: "Accepted",      emoji: "🎉" },
        pending:       { text: "Still waiting", emoji: "⏳" },
        rejected:      { text: "Rejected",      emoji: "😔" },
        changed_plans: { text: "Changed plans", emoji: "🔄" },
      })}

      <p style="font-size:13px;color:#5F5E5A;line-height:1.5;">
        Your feedback helps us improve document quality for everyone.
        Thank you!
      </p>
      ${footer()}
    </div>
  `;
}
