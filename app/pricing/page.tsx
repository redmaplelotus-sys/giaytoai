"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

// ---------------------------------------------------------------------------
// Pack definitions (must match lib/stripe.ts CREDIT_PACKS)
// ---------------------------------------------------------------------------

interface PackDef {
  id: string;
  name: string;
  credits: number | null; // null = unlimited
  priceUsd: number; // cents
  perDoc: string;
  popular: boolean;
  recurring: boolean;
}

const PACKS: PackDef[] = [
  { id: "starter",   name: "Starter",   credits: 5,    priceUsd: 400,  perDoc: "$0.80", popular: false, recurring: false },
  { id: "standard",  name: "Standard",  credits: 15,   priceUsd: 800,  perDoc: "$0.53", popular: true,  recurring: false },
  { id: "pro",       name: "Pro",       credits: 40,   priceUsd: 1600, perDoc: "$0.40", popular: false, recurring: false },
  { id: "unlimited", name: "Unlimited", credits: null,  priceUsd: 1200, perDoc: "",      popular: false, recurring: true  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy(packId: string) {
    if (!isSignedIn) {
      router.push("/sign-up");
      return;
    }

    setError(null);
    setLoadingPack(packId);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }

      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      setLoadingPack(null);
    }
  }

  return (
    <main style={{ width: "100%", maxWidth: 1100, marginLeft: "auto", marginRight: "auto", paddingTop: 48, paddingBottom: 64, paddingLeft: "clamp(20px, 4vw, 48px)", paddingRight: "clamp(20px, 4vw, 48px)" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1B3A5C", letterSpacing: "-0.02em", marginBottom: 8 }}>
          Bảng giá
        </h1>
        <p style={{ fontSize: 15, color: "#5F5E5A", maxWidth: 480, margin: "0 auto" }}>
          Mỗi lượt = 1 tài liệu hoàn chỉnh. Không cần đăng ký hàng tháng.
        </p>
      </div>

      {/* Free tier callout */}
      <div style={{
        textAlign: "center",
        padding: "12px 20px",
        borderRadius: 10,
        background: "#EAF3DE",
        border: "1px solid #C0DD97",
        marginBottom: 32,
        fontSize: 14,
        color: "#27500A",
        fontWeight: 500,
      }}>
        🎁 2 tài liệu đầu tiên miễn phí khi đăng ký — không cần thẻ ngân hàng
      </div>

      {/* Pack grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 32 }}>
        {PACKS.map((pack) => {
          const isLoading = loadingPack === pack.id;
          const priceDisplay = `$${(pack.priceUsd / 100).toFixed(0)}`;

          return (
            <div
              key={pack.id}
              style={{
                borderRadius: 12,
                border: pack.popular ? "2px solid #1B3A5C" : "1px solid #E8E8E4",
                background: "#fff",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                position: "relative",
              }}
            >
              {pack.popular && (
                <span style={{
                  position: "absolute",
                  top: -11,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#1B3A5C",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 12px",
                  borderRadius: 20,
                  whiteSpace: "nowrap",
                }}>
                  Phổ biến nhất
                </span>
              )}

              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1B3A5C", marginBottom: 4 }}>
                  {pack.name}
                </h3>
                <p style={{ fontSize: 13, color: "#5F5E5A" }}>
                  {pack.credits !== null
                    ? `${pack.credits} tài liệu`
                    : "Không giới hạn"}
                  {pack.recurring && " · hàng tháng"}
                </p>
              </div>

              <div>
                <span style={{ fontSize: 32, fontWeight: 700, color: "#1B3A5C" }}>
                  {priceDisplay}
                </span>
                {pack.recurring ? (
                  <span style={{ fontSize: 14, color: "#5F5E5A" }}> /tháng</span>
                ) : (
                  <span style={{ fontSize: 14, color: "#5F5E5A" }}> USD</span>
                )}
                {pack.perDoc && (
                  <p style={{ fontSize: 12, color: "#5F5E5A", marginTop: 4 }}>
                    {pack.perDoc} / tài liệu
                  </p>
                )}
              </div>

              <Button
                variant={pack.popular ? "primary" : "secondary"}
                arrow={pack.popular}
                onClick={() => handleBuy(pack.id)}
                disabled={!!loadingPack}
                style={{ width: "100%", justifyContent: "center", marginTop: "auto" }}
              >
                {isLoading ? "Đang xử lý…" : "Mua ngay"}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <p style={{ textAlign: "center", fontSize: 14, color: "var(--color-red)", marginBottom: 16 }}>
          {error}
        </p>
      )}

      {/* Footer note */}
      <p style={{ textAlign: "center", fontSize: 13, color: "#5F5E5A" }}>
        Thanh toán an toàn qua Stripe · Hỗ trợ Visa, Mastercard, Apple Pay, Google Pay
      </p>
    </main>
  );
}
