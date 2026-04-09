import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getUserByClerkId(clerkId: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("clerk_id", clerkId)
    .single();
  if (error) throw error;
  return data;
}

export async function getUserCredits(
  clerkId: string,
): Promise<{ credits_remaining: number; plan: string }> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("credits_remaining, plan")
    .eq("clerk_id", clerkId)
    .single();
  if (error) throw error;
  return data;
}

/** Deducts one credit. Throws if the user has none (handled by the SQL function). */
export async function consumeCredit(clerkId: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc("consume_credit", {
    p_clerk_id: clerkId,
  });
  if (error) throw error;
}

/** Returns credits after a failed or cancelled job. Defaults to 1. */
export async function refundCredit(
  clerkId: string,
  amount = 1,
): Promise<void> {
  const { error } = await supabaseAdmin.rpc("refund_credit", {
    p_clerk_id: clerkId,
    p_amount: amount,
  });
  if (error) throw error;
}

/** Adds credits after a successful payment. */
export async function addCredits(
  clerkId: string,
  amount: number,
): Promise<void> {
  const { error } = await supabaseAdmin.rpc("add_credits", {
    p_clerk_id: clerkId,
    p_amount: amount,
  });
  if (error) throw error;
}

/**
 * Inserts a Stripe webhook event. Silently skips duplicates so the
 * handler is safe to retry — Stripe may deliver the same event twice.
 */
export async function recordStripeEvent(
  id: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("stripe_events")
    .upsert({ id, type, payload }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function getUserLocale(clerkId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("locale")
    .eq("clerk_id", clerkId)
    .single();
  if (error) throw error;
  return data.locale;
}
