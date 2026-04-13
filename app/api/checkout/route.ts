import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getStripe, CREDIT_PACKS } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ---------------------------------------------------------------------------
// POST /api/checkout
//
// Body: { packId: "starter" | "standard" | "pro" | "unlimited" }
// Returns: { url: string } — Stripe Checkout session URL
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { packId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pack = CREDIT_PACKS.find((p) => p.id === body.packId);
  if (!pack || !pack.stripePriceId) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 422 });
  }

  const stripe = getStripe();

  // ── Get or create Stripe customer ─────────────────────────────────────
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("clerk_id, stripe_customer_id, email")
    .eq("clerk_id", userId)
    .single();

  let customerId = user?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { clerk_id: userId },
      ...(user?.email ? { email: user.email } : {}),
    });
    customerId = customer.id;

    await supabaseAdmin
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("clerk_id", userId);
  }

  // ── Create Checkout Session ───────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: pack.recurring ? "subscription" : "payment",
    line_items: [{ price: pack.stripePriceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?checkout=success&pack=${pack.id}`,
    cancel_url: `${appUrl}/pricing?checkout=cancelled`,
    metadata: {
      clerk_id: userId,
      pack_id: pack.id,
      credits: String(pack.credits),
    },
  });

  return NextResponse.json({ url: session.url });
}
