import { supabaseAdmin } from "@/lib/supabase-admin";

/** Creates an empty draft placeholder when a session begins AI generation. */
export async function createDraft(
  sessionId: string,
  userId: string,
  promptVersionId?: string,
) {
  const { data, error } = await supabaseAdmin
    .from("drafts")
    .insert({
      session_id: sessionId,
      user_id: userId,
      ...(promptVersionId && { prompt_version_id: promptVersionId }),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

/** Writes the AI-generated content, model name, and token count into a draft. */
export async function completeDraft(
  draftId: string,
  content: Record<string, unknown>,
  model: string,
  tokensUsed: number,
) {
  const { error } = await supabaseAdmin
    .from("drafts")
    .update({ content, model, tokens_used: tokensUsed })
    .eq("id", draftId);
  if (error) throw error;
}

/** Records an AI or human quality assessment for a draft. */
export async function updateDraftQuality(
  draftId: string,
  score: 1 | 2 | 3 | 4 | 5,
  feedback?: string,
) {
  const { error } = await supabaseAdmin
    .from("drafts")
    .update({
      quality_score: score,
      ...(feedback !== undefined && { quality_feedback: feedback }),
    })
    .eq("id", draftId);
  if (error) throw error;
}

export async function getDraft(draftId: string) {
  const { data, error } = await supabaseAdmin
    .from("drafts")
    .select("*")
    .eq("id", draftId)
    .single();
  if (error) throw error;
  return data;
}

/** Returns only the quality fields — avoids fetching large content blobs. */
export async function getDraftQuality(draftId: string) {
  const { data, error } = await supabaseAdmin
    .from("drafts")
    .select("id, quality_score, quality_feedback")
    .eq("id", draftId)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Queues an outcome email. Pass sendAt to defer delivery;
 * omit it to signal immediate dispatch.
 */
export async function scheduleOutcomeEmail(
  sessionId: string,
  userId: string,
  type: string,
  sendAt?: Date,
) {
  const { data, error } = await supabaseAdmin
    .from("outcome_emails")
    .insert({
      session_id: sessionId,
      user_id: userId,
      type,
      ...(sendAt && { send_at: sendAt.toISOString() }),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

/** Returns all draft revisions for a session, newest first. */
export async function getDraftRevisions(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from("drafts")
    .select(
      "id, content, model, tokens_used, quality_score, quality_feedback, created_at, updated_at",
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Saves a new revision by inserting a fresh draft row for the same session. */
export async function saveRevision(
  sessionId: string,
  userId: string,
  content: Record<string, unknown>,
  promptVersionId?: string,
) {
  const { data, error } = await supabaseAdmin
    .from("drafts")
    .insert({
      session_id: sessionId,
      user_id: userId,
      content,
      ...(promptVersionId && { prompt_version_id: promptVersionId }),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}
