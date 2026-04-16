import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ---------------------------------------------------------------------------
// GET /api/outcome?id=<emailId>&outcome=accepted|pending|rejected|changed_plans
//
// One-click handler from outcome feedback emails. No auth required —
// the email ID acts as an unguessable token (UUID).
// Records the outcome and redirects to a thank-you page.
// ---------------------------------------------------------------------------

const VALID_OUTCOMES = new Set(["accepted", "pending", "rejected", "changed_plans"]);

export async function GET(request: NextRequest) {
  const emailId = request.nextUrl.searchParams.get("id");
  const outcome = request.nextUrl.searchParams.get("outcome");

  if (!emailId || !outcome || !VALID_OUTCOMES.has(outcome)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Fetch the outcome email record
  const { data: email } = await supabaseAdmin
    .from("outcome_emails")
    .select("id, user_id, session_id, type")
    .eq("id", emailId)
    .single();

  if (!email) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Store outcome in outcome_emails.type field
  await supabaseAdmin
    .from("outcome_emails")
    .update({ type: `outcome_${outcome}` })
    .eq("id", emailId);

  // Also record in PostHog-style by inserting a feedback row
  await supabaseAdmin
    .from("feedback")
    .insert({
      session_id: email.session_id,
      user_id: email.user_id,
      rating: outcome === "accepted" ? 5 : outcome === "pending" ? 3 : outcome === "rejected" ? 2 : 3,
      comment: `outcome: ${outcome}`,
    })
    .then(({ error }) => {
      if (error) console.warn("[outcome] feedback insert skipped:", error.message);
    });

  // Redirect to thank-you page
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://giaytoai.com";
  const thankYouUrl = new URL(`${appUrl}/outcome/thanks`);
  thankYouUrl.searchParams.set("outcome", outcome);
  return NextResponse.redirect(thankYouUrl);
}
