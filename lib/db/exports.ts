import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Creates an export row after verifying the requesting user owns the
 * source draft. Throws if the draft is not found or belongs to someone else.
 */
export async function saveExport(
  draftId: string,
  sessionId: string,
  userId: string,
  format: "pdf" | "docx" | "html",
  r2Key?: string,
) {
  // Ownership check: the query returns nothing if the draft does not exist
  // or if user_id does not match, so a missing row is always an auth failure.
  const { data: draft, error: ownershipError } = await supabaseAdmin
    .from("drafts")
    .select("id")
    .eq("id", draftId)
    .eq("user_id", userId)
    .single();

  if (ownershipError || !draft) {
    throw new Error(
      `Draft ${draftId} not found or does not belong to user ${userId}`,
    );
  }

  const { data, error } = await supabaseAdmin
    .from("exports")
    .insert({
      draft_id: draftId,
      session_id: sessionId,
      user_id: userId,
      format,
      ...(r2Key && { r2_key: r2Key }),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function getExport(exportId: string) {
  const { data, error } = await supabaseAdmin
    .from("exports")
    .select("*")
    .eq("id", exportId)
    .single();
  if (error) throw error;
  return data;
}
