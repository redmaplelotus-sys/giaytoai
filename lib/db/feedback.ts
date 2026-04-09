import { supabaseAdmin } from "@/lib/supabase-admin";

export async function saveFeedback(
  sessionId: string,
  userId: string,
  rating: 1 | 2 | 3 | 4 | 5,
  draftId?: string,
  comment?: string,
) {
  const { data, error } = await supabaseAdmin
    .from("feedback")
    .insert({
      session_id: sessionId,
      user_id: userId,
      rating,
      ...(draftId && { draft_id: draftId }),
      ...(comment && { comment }),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

/** Marks an outcome email as sent, recording the Resend message ID and timestamp. */
export async function updateOutcome(
  outcomeEmailId: string,
  resendId: string,
  sentAt: Date = new Date(),
) {
  const { error } = await supabaseAdmin
    .from("outcome_emails")
    .update({ resend_id: resendId, sent_at: sentAt.toISOString() })
    .eq("id", outcomeEmailId);
  if (error) throw error;
}
