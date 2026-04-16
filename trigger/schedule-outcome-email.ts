import { task } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ---------------------------------------------------------------------------
// Job A: Schedule an outcome email 56 days after a draft is exported.
//
// Called from lib/events.ts onDraftExported(). Inserts a row into
// outcome_emails with send_at = now + 56 days.
//
// Table columns: id, session_id, user_id, resend_id, type, sent_at,
//                created_at, send_at
// ---------------------------------------------------------------------------

export interface ScheduleOutcomeEmailPayload {
  userId: string;
  sessionId: string;
  format: string;
}

export const scheduleOutcomeEmail = task({
  id: "schedule-outcome-email",
  run: async (payload: ScheduleOutcomeEmailPayload) => {
    const sendAt = new Date(Date.now() + 56 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin
      .from("outcome_emails")
      .insert({
        user_id: payload.userId,
        session_id: payload.sessionId,
        type: "outcome_feedback",
        send_at: sendAt,
      });

    if (error) {
      console.error("[schedule-outcome-email] insert failed:", error);
      throw error;
    }

    return { scheduled: sendAt };
  },
});
