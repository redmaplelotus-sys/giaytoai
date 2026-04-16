import { task } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ---------------------------------------------------------------------------
// Job A: Schedule an outcome email 56 days after a draft is exported.
//
// Called from lib/events.ts onDraftExported(). Inserts a row into
// outcome_emails with send_at = now + 56 days.
// ---------------------------------------------------------------------------

export interface ScheduleOutcomeEmailPayload {
  userId: string;
  draftId: string;
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
        draft_id: payload.draftId,
        session_id: payload.sessionId,
        format: payload.format,
        send_at: sendAt,
        status: "pending",
      });

    if (error) {
      console.error("[schedule-outcome-email] insert failed:", error);
      throw error; // retry via trigger config
    }

    return { scheduled: sendAt };
  },
});
