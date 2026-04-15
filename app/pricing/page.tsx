"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PayOSCheckout } from "@/components/payment/PayOSCheckout";

// ---------------------------------------------------------------------------
// Pack definitions
// ---------------------------------------------------------------------------

interface PackDef {
  id: string;
  name: string;
  credits: number | null;
  price: string;
  perDoc: string;
  popular: boolean;
  recurring: boolean;
}

const USD_PACKS: PackDef[] = [
  { id: "starter",   name: "Starter",   credits: 5,    price: "$4",       perDoc: "$0.80",  popular: false, recurring: false },
  { id: "standard",  name: "Standard",  credits: 15,   price: "$8",       perDoc: "$0.53",  popular: true,  recurring: false },
  { id: "pro",       name: "Pro",       credits: 40,   price: "$16",      perDoc: "$0.40",  popular: false, recurring: false },
  { id: "unlimited", name: "Unlimited", credits: null,  price: "$12",      perDoc: "",       popular: false, recurring: true  },
];

const VND_PACKS: PackDef[] = [
  { id: "starter",   name: "Starter",   credits: 5,    price: "49.000₫",  perDoc: "9.800₫", popular: false, recurring: false },
  { id: "standard",  name: "Standard",  credits: 15,   price: "99.000₫",  perDoc: "6.600₫", popular: true,  recurring: false },
  { id: "pro",       name: "Pro",       credits: 40,   price: "199.000₫", perDoc: "4.975₫", popular: false, recurring: false },
  { id: "unlimited", name: "Unlimited", credits: null,  price: "299.000₫", perDoc: "",       popular: false, recurring: true  },
];

type Currency = "vnd" | "usd";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>("vnd");
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedVndPack, setSelectedVndPack] = useState<PackDef | null>(null);

  const packs = currency === "vnd" ? VND_PACKS : USD_PACKS;

  async function handleBuy(pack: PackDef) {
    if (!isSignedIn) {
      router.push("/sign-up");
      return;
    }

    // VND: show inline QR checkout
    if (currency === "vnd") {
      setSelectedVndPack(pack);
      setError(null);
      return;
    }

    // USD: redirect to Stripe
    setError(null);
    setLoadingPack(pack.id);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }

      const data = await res.json() as { url: string };
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      setLoadingPack(null);
    }
  }

  return (
    <main style={{ width: "100%", maxWidth: 1100, marginLeft: "auto", marginRight: "auto", paddingTop: 48, paddingBottom: 64, paddingLeft: "clamp(20px, 4vw, 48px)", paddingRight: "clamp(20px, 4vw, 48px)" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1B3A5C", letterSpacing: "-0.02em", marginBottom: 8 }}>
          Bảng giá
        </h1>
        <p style={{ fontSize: 15, color: "#5F5E5A", maxWidth: 480, margin: "0 auto" }}>
          Mỗi lượt = 1 tài liệu hoàn chỉnh. Không cần đăng ký hàng tháng.
        </p>
      </div>

      {/* Currency toggle */}
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 32 }}>
        <button
          type="button"
          onClick={() => { setCurrency("vnd"); setSelectedVndPack(null); }}
          style={{
            padding: "8px 20px",
            borderRadius: "20px 0 0 20px",
            border: "1.5px solid #1B3A5C",
            background: currency === "vnd" ? "#1B3A5C" : "#fff",
            color: currency === "vnd" ? "#fff" : "#1B3A5C",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          🇻🇳 VND
        </button>
        <button
          type="button"
          onClick={() => { setCurrency("usd"); setSelectedVndPack(null); }}
          style={{
            padding: "8px 20px",
            borderRadius: "0 20px 20px 0",
            border: "1.5px solid #1B3A5C",
            borderLeft: "none",
            background: currency === "usd" ? "#1B3A5C" : "#fff",
            color: currency === "usd" ? "#fff" : "#1B3A5C",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          🌍 USD
        </button>
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
        {packs.map((pack) => {
          const isLoading = loadingPack === pack.id;
          const isSelected = selectedVndPack?.id === pack.id;

          return (
            <div
              key={pack.id}
              style={{
                borderRadius: 12,
                border: isSelected
                  ? "2px solid #185FA5"
                  : pack.popular
                    ? "2px solid #1B3A5C"
                    : "1px solid #E8E8E4",
                background: "#fff",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                position: "relative",
              }}
            >
              {pack.popular && !isSelected && (
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
                  {pack.price}
                </span>
                {pack.recurring && (
                  <span style={{ fontSize: 14, color: "#5F5E5A" }}> /tháng</span>
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
                onClick={() => handleBuy(pack)}
                disabled={!!loadingPack}
                style={{ width: "100%", justifyContent: "center", marginTop: "auto" }}
              >
                {isLoading ? "Đang xử lý…" : isSelected ? "Đã chọn" : "Mua ngay"}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Inline PayOS QR checkout */}
      {selectedVndPack && currency === "vnd" && (
        <div style={{ maxWidth: 420, margin: "0 auto 32px" }}>
          <PayOSCheckout
            packId={selectedVndPack.id}
            packName={selectedVndPack.name}
            priceLabel={selectedVndPack.price}
            credits={selectedVndPack.credits}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <p style={{ textAlign: "center", fontSize: 14, color: "var(--color-red)", marginBottom: 16 }}>
          {error}
        </p>
      )}

      {/* Footer note */}
      <p style={{ textAlign: "center", fontSize: 13, color: "#5F5E5A" }}>
        {currency === "vnd"
          ? "Thanh toán qua chuyển khoản ngân hàng, Momo, ZaloPay · Hỗ trợ tiếng Việt"
          : "Thanh toán an toàn qua Stripe · Hỗ trợ Visa, Mastercard, Apple Pay, Google Pay"}
      </p>
    </main>
  );
}
