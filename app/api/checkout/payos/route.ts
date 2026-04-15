import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPayOS, VND_PACKS } from "@/lib/payos";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// POST /api/checkout/payos
//
// Body: { packId: "starter" | "standard" | "pro" | "unlimited" }
// Returns: { checkoutUrl, qrCode, orderCode, expiresAt }
// Rate limit: 5 requests per 5 minutes
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit("checkout", userId, request);
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: { packId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pack = VND_PACKS.find((p) => p.id === body.packId);
  if (!pack) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 422 });
  }

  const payos = getPayOS();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Generate a unique numeric order code (PayOS requires a number, under 8 digits)
  // Last 4 digits of timestamp + 3-digit random suffix = max 9999999
  const orderCode = (Date.now() % 10000) * 1000 + Math.floor(Math.random() * 1000);

  // ── Create PayOS payment link ───────────────────────────────────────────
  const description = pack.recurring
    ? `Giay To AI - ${pack.name}`
    : `GiayToAI ${pack.name} ${pack.credits}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentData: any = await payos.createPaymentLink({
    orderCode,
    amount: pack.priceVnd,
    description: description.slice(0, 25), // PayOS limits to 25 chars
    returnUrl: `${appUrl}/dashboard?checkout=success&pack=${pack.id}&provider=payos`,
    cancelUrl: `${appUrl}/pricing?checkout=cancelled&provider=payos`,
  });

  // Payment link expires after 30 minutes
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  // ── Record pending order in DB ──────────────────────────────────────────
  await supabaseAdmin
    .from("payos_orders")
    .insert({
      order_code: orderCode,
      user_id: userId,
      pack_id: pack.id,
      credits: pack.credits,
      amount_vnd: pack.priceVnd,
      status: "pending",
      checkout_url: paymentData.checkoutUrl,
      qr_code: paymentData.qrCode,
      expires_at: expiresAt,
    });

  return NextResponse.json({
    checkoutUrl: paymentData.checkoutUrl,
    qrCode: paymentData.qrCode,
    orderCode,
    expiresAt,
  });
}
