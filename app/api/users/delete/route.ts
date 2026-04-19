import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Resend } from "resend";

// ---------------------------------------------------------------------------
// POST /api/users/delete
//
// Soft-deletes the user account:
// 1. Erases PII immediately (name, email → "[deleted]")
// 2. Sets deleted_at timestamp for 30-day hard-delete by cleanup job
// 3. Sends confirmation email via Resend
// 4. Deletes Clerk user (prevents sign-in)
// ---------------------------------------------------------------------------

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@giaytoai.com";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch user email before erasure (for confirmation email)
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("email, clerk_id, deleted_at")
    .eq("clerk_id", userId)
    .single();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.deleted_at) {
    return NextResponse.json({ error: "Account already deleted" }, { status: 409 });
  }

  const userEmail = user.email;

  // ── 1. Erase PII immediately ────────────────────────────────────────────
  await supabaseAdmin
    .from("users")
    .update({
      email: "[deleted]",
      deleted_at: new Date().toISOString(),
      consent_status: "withdrawn",
    })
    .eq("clerk_id", userId);

  // Erase PII from sessions (answers may contain personal info)
  const { data: sessions } = await supabaseAdmin
    .from("sessions")
    .select("id")
    .eq("user_id", userId);

  if (sessions && sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id);

    // Clear answers (contain personal info like name, background, etc.)
    await supabaseAdmin
      .from("sessions")
      .update({ answers: {} })
      .in("id", sessionIds);

    // Clear draft content (may contain personal info)
    await supabaseAdmin
      .from("drafts")
      .update({ content: { text: "[deleted]", html: "" } })
      .in("session_id", sessionIds);
  }

  // Clear CV uploads from R2 (if any exist)
  const { data: uploads } = await supabaseAdmin
    .from("uploads")
    .select("id, r2_key")
    .eq("user_id", userId);

  if (uploads && uploads.length > 0) {
    try {
      const { deleteFromR2 } = await import("@/lib/r2");
      for (const upload of uploads) {
        if (upload.r2_key) {
          await deleteFromR2(upload.r2_key).catch(() => {});
        }
      }
    } catch {
      // R2 not configured — skip
    }
  }

  // ── 2. Send confirmation email ──────────────────────────────────────────
  if (userEmail && userEmail !== "[deleted]") {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: userEmail,
        subject: "Xác nhận xóa tài khoản Giấy Tờ AI",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
            <p style="font-size:15px;color:#1B3A5C;line-height:1.6;">Xin chào,</p>
            <p style="font-size:15px;color:#444441;line-height:1.6;">
              Tài khoản Giấy Tờ AI của bạn đã được đánh dấu để xóa.
            </p>
            <ul style="font-size:14px;color:#444441;line-height:1.8;">
              <li>Thông tin cá nhân (tên, email, CV) đã được <strong>xóa ngay lập tức</strong>.</li>
              <li>Tài liệu và dữ liệu còn lại sẽ được <strong>xóa hoàn toàn sau 30 ngày</strong>.</li>
              <li>Nếu bạn muốn khôi phục tài khoản trong 30 ngày, liên hệ <a href="mailto:support@giaytoai.com" style="color:#185FA5;">support@giaytoai.com</a>.</li>
            </ul>
            <p style="font-size:13px;color:#5F5E5A;line-height:1.5;">
              Cảm ơn bạn đã sử dụng Giấy Tờ AI. Chúc bạn thành công!
            </p>
            <hr style="border:none;border-top:1px solid #E8E8E4;margin:24px 0;" />
            <p style="font-size:11px;color:#999;">Giấy Tờ AI · Tài liệu quốc tế chuyên nghiệp</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[delete-account] confirmation email failed:", err);
      // Non-fatal — account is still deleted
    }
  }

  // ── 3. Delete Clerk user (prevents sign-in) ──────────────────────────
  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId);
  } catch (err) {
    console.error("[delete-account] Clerk user deletion failed:", err);
    // Non-fatal — PII already erased, user can't do anything useful
  }

  return NextResponse.json({ ok: true });
}
