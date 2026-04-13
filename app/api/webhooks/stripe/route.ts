import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getStripe, getPackByPriceId } from "@/lib/stripe";
import { serverEnv } from "@/lib/server-env";
import { addCredits, recordStripeEvent } from "@/lib/db/users";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ---------------------------------------------------------------------------
// POST /api/webhooks/stripe
//
// Receives Stripe webhook events. Verifies the signature, then processes:
//   - checkout.session.completed → add credits (one-time) or upgrade plan (subscription)
//   - invoice.payment_succeeded → renew subscription credits
//   - customer.subscription.deleted → downgrade plan to free
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const webhookSecret = serverEnv.stripeWebhookSecret;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: record the event, skip if already processed
  try {
    await recordStripeEvent(event.id, event.type, event.data as unknown as Record<string, unknown>);
  } catch {
    // Duplicate event — already processed
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const clerkId = session.metadata?.clerk_id;
        const packId = session.metadata?.pack_id;
        const credits = parseInt(session.metadata?.credits ?? "0", 10);

        if (!clerkId) break;

        if (packId === "unlimited") {
          // Upgrade to unlimited plan
          await supabaseAdmin
            .from("users")
            .update({ plan: "unlimited" })
            .eq("clerk_id", clerkId);
        } else if (credits > 0) {
          // One-time credit pack
          await addCredits(clerkId, credits);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        // Only process subscription renewals, not the initial payment
        if (invoice.billing_reason !== "subscription_cycle") break;

        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;
        if (!customerId) break;

        // Find the user by stripe_customer_id
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("clerk_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (user) {
          // Keep unlimited plan active
          await supabaseAdmin
            .from("users")
            .update({ plan: "unlimited" })
            .eq("clerk_id", user.clerk_id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;
        if (!customerId) break;

        const { data: user } = await supabaseAdmin
          .from("users")
          .select("clerk_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (user) {
          // Downgrade to free plan
          await supabaseAdmin
            .from("users")
            .update({ plan: "free" })
            .eq("clerk_id", user.clerk_id);
        }
        break;
      }
    }
  } catch (err) {
    console.error(`[stripe webhook] error processing ${event.type}:`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
