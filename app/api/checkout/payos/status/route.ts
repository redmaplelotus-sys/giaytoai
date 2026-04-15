import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPayOS } from "@/lib/payos";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { addCredits } from "@/lib/db/users";

// ---------------------------------------------------------------------------
// GET /api/checkout/payos/status?orderCode=1234567
//
// 1. Check DB first (webhook may have already fired)
// 2. If still pending, fall back to PayOS API
// 3. Verify user owns the order
//
// Returns: { status: "completed" | "pending" | "failed", credits?: number }
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderCode = request.nextUrl.searchParams.get("orderCode");
  if (!orderCode) {
    return NextResponse.json({ error: "orderCode is required" }, { status: 400 });
  }

  // ── Fetch order from DB ─────────────────────────────────────────────────
  const { data: order, error } = await supabaseAdmin
    .from("payos_orders")
    .select("order_code, user_id, pack_id, credits, status, amount_vnd")
    .eq("order_code", parseInt(orderCode, 10))
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // ── Verify user owns this order ─────────────────────────────────────────
  if (order.user_id !== userId) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // ── If already completed or failed, return immediately ──────────────────
  if (order.status === "completed") {
    return NextResponse.json({
      status: "completed",
      credits: order.pack_id === "unlimited" ? null : order.credits,
    });
  }

  if (order.status === "failed") {
    return NextResponse.json({ status: "failed" });
  }

  // ── Still pending — check PayOS API as fallback ─────────────────────────
  try {
    const payos = getPayOS();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentInfo: any = await payos.getPaymentLinkInformation(order.order_code);

    if (paymentInfo.status === "PAID") {
      // Webhook didn't fire yet — process payment now
      if (order.pack_id === "unlimited") {
        await supabaseAdmin
          .from("users")
          .update({ plan: "unlimited" })
          .eq("clerk_id", order.user_id);
      } else if (order.credits > 0) {
        await addCredits(order.user_id, order.credits);
      }

      await supabaseAdmin
        .from("payos_orders")
        .update({ status: "completed", paid_at: new Date().toISOString() })
        .eq("order_code", order.order_code)
        .eq("status", "pending"); // idempotency guard

      return NextResponse.json({
        status: "completed",
        credits: order.pack_id === "unlimited" ? null : order.credits,
      });
    }

    if (paymentInfo.status === "CANCELLED" || paymentInfo.status === "EXPIRED") {
      await supabaseAdmin
        .from("payos_orders")
        .update({ status: "failed" })
        .eq("order_code", order.order_code)
        .eq("status", "pending");

      return NextResponse.json({ status: "failed" });
    }

    // Still waiting for payment
    return NextResponse.json({ status: "pending" });
  } catch (err) {
    console.error("[payos status] API check failed:", err);
    // PayOS API unreachable — return DB status
    return NextResponse.json({ status: order.status });
  }
}
