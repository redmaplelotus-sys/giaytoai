import { supabaseAdmin } from "@/lib/supabase-admin";

export async function createSession(
  userId: string,
  documentTypeId: string,
  scheduledAt?: Date,
) {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .insert({
      user_id: userId,
      document_type_id: documentTypeId,
      ...(scheduledAt && { scheduled_at: scheduledAt.toISOString() }),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function saveAnswers(
  sessionId: string,
  answers: Record<string, unknown>,
) {
  const { error } = await supabaseAdmin
    .from("sessions")
    .update({ answers })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function getSession(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select(
      `
      *,
      document_types ( id, slug, name_vi, name_en )
      `,
    )
    .eq("id", sessionId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateSessionStatus(
  sessionId: string,
  status: "pending" | "processing" | "completed" | "failed",
) {
  const { error } = await supabaseAdmin
    .from("sessions")
    .update({ status })
    .eq("id", sessionId);
  if (error) throw error;
}

/** Returns sessions for the document history page, newest first.
 *  Includes the joined document type, all draft IDs (for "continue" links),
 *  and all export records (for re-download). Callers pick the latest draft/
 *  export by sorting the returned arrays. Defaults to the 50 most recent.
 */
export async function getUserSessions(
  userId: string,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {},
) {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select(
      `
      id,
      status,
      answers,
      created_at,
      document_types ( slug, name_en, name_vi ),
      drafts ( id, created_at ),
      exports ( id, format, r2_key, created_at )
      `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data;
}
