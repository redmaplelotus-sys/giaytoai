import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ---------------------------------------------------------------------------
// POST /api/users/consent
//
// Body: { consent: "accepted" | "declined", consentedAt: string }
// Stores consent status in the users table. Non-authenticated requests
// are silently accepted (consent stored in localStorage only).
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    // Not signed in — consent is stored client-side only
    return NextResponse.json({ ok: true });
  }

  let body: { consent?: string; consentedAt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const consent = body.consent;
  if (consent !== "accepted" && consent !== "declined") {
    return NextResponse.json({ error: "Invalid consent value" }, { status: 422 });
  }

  await supabaseAdmin
    .from("users")
    .update({
      consent_status: consent,
      consented_at: body.consentedAt ?? new Date().toISOString(),
    })
    .eq("clerk_id", userId);

  return NextResponse.json({ ok: true });
}
