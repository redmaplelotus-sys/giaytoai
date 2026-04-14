import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPayOS } from "@/lib/payos";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { addCredits } from "@/lib/db/users";

// ---------------------------------------------------------------------------
// POST /api/webhooks/payos
//
// Receives PayOS webhook callbacks. Verifies signature, then processes
// successful payments by adding credits or upgrading plan.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const payos = getPayOS();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Verify webhook signature ────────────────────────────────────────────
  let webhookData;
  try {
    webhookData = payos.verifyPaymentWebhookData(body);
  } catch (err) {
    console.error("[payos webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const orderCode = webhookData.orderCode;
  const payosStatus = webhookData.code;

  // Only process successful payments (code "00")
  if (payosStatus !== "00") {
    // Update order status for tracking
    await supabaseAdmin
      .from("payos_orders")
      .update({ status: "failed" })
      .eq("order_code", orderCode)
      .eq("status", "pending");

    return NextResponse.json({ received: true });
  }

  // ── Idempotency: skip if already completed ──────────────────────────────
  const { data: order } = await supabaseAdmin
    .from("payos_orders")
    .select("user_id, pack_id, credits, status")
    .eq("order_code", orderCode)
    .single();

  if (!order || order.status === "completed") {
    return NextResponse.json({ received: true });
  }

  // ── Process payment ─────────────────────────────────────────────────────
  try {
    if (order.pack_id === "unlimited") {
      await supabaseAdmin
        .from("users")
        .update({ plan: "unlimited" })
        .eq("clerk_id", order.user_id);
    } else if (order.credits > 0) {
      await addCredits(order.user_id, order.credits);
    }

    // Mark order as completed
    await supabaseAdmin
      .from("payos_orders")
      .update({ status: "completed", paid_at: new Date().toISOString() })
      .eq("order_code", orderCode);
  } catch (err) {
    console.error(`[payos webhook] error processing order ${orderCode}:`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
