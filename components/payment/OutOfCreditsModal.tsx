"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PayOSCheckout } from "@/components/payment/PayOSCheckout";

// ---------------------------------------------------------------------------
// Pack definitions (inline — keeps the component self-contained)
// ---------------------------------------------------------------------------

interface PackOption {
  id: string;
  name: string;
  credits: number | null;
  priceVnd: string;
  priceUsd: string;
  perDoc: string;
  popular: boolean;
  recurring: boolean;
}

const PACKS: PackOption[] = [
  { id: "starter",   name: "Starter",   credits: 5,   priceVnd: "49.000₫",  priceUsd: "$4",  perDoc: "9.800₫", popular: false, recurring: false },
  { id: "standard",  name: "Standard",  credits: 15,  priceVnd: "99.000₫",  priceUsd: "$8",  perDoc: "6.600₫", popular: true,  recurring: false },
  { id: "pro",       name: "Pro",       credits: 40,  priceVnd: "199.000₫", priceUsd: "$16", perDoc: "4.975₫", popular: false, recurring: false },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface OutOfCreditsModalProps {
  /** First paragraph of the document (shown blurred as preview) */
  documentPreview?: string;
  onDismiss: () => void;
}

export function OutOfCreditsModal({ documentPreview, onDismiss }: OutOfCreditsModalProps) {
  const router = useRouter();
  const [selectedPack, setSelectedPack] = useState<PackOption | null>(null);
  const [loadingStripe, setLoadingStripe] = useState<string | null>(null);

  async function handleStripe(pack: PackOption) {
    setLoadingStripe(pack.id);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id }),
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json() as { url: string };
      if (url) window.location.href = url;
    } catch {
      // Fall back to pricing page
      router.push("/pricing");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 28px 0", textAlign: "center" }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📄</p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1B3A5C", marginBottom: 6 }}>
            Tài liệu đã sẵn sàng!
          </h2>
          <p style={{ fontSize: 14, color: "#5F5E5A", marginBottom: 20, lineHeight: 1.5 }}>
            Bạn đã hết lượt miễn phí. Mua thêm lượt để xem và tải xuống tài liệu.
          </p>
        </div>

        {/* Blurred document preview */}
        {documentPreview && (
          <div style={{ padding: "0 28px", marginBottom: 20 }}>
            <div
              style={{
                position: "relative",
                borderRadius: 10,
                background: "#F7F7F5",
                border: "1px solid #E8E8E4",
                padding: "16px 20px",
                overflow: "hidden",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: "#444441",
                  lineHeight: 1.7,
                  margin: 0,
                  filter: "blur(3px)",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              >
                {documentPreview.slice(0, 300)}
                {documentPreview.length > 300 && "…"}
              </p>
              {/* Gradient fade */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to bottom, transparent 30%, #F7F7F5 90%)",
                  pointerEvents: "none",
                }}
              />
              {/* Lock label */}
              <div style={{
                position: "absolute",
                bottom: 12,
                left: 0,
                right: 0,
                textAlign: "center",
              }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#854F0B",
                  background: "#FAEEDA",
                  border: "1px solid #FAC775",
                  borderRadius: 16,
                  padding: "4px 12px",
                }}>
                  🔒 Mua lượt để mở khóa
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Pack options */}
        <div style={{ padding: "0 28px", marginBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PACKS.map((pack) => {
              const isSelected = selectedPack?.id === pack.id;
              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => setSelectedPack(isSelected ? null : pack)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    borderRadius: 10,
                    border: isSelected
                      ? "2px solid #1B3A5C"
                      : pack.popular
                        ? "2px solid #C0DD97"
                        : "1px solid #E8E8E4",
                    background: isSelected ? "#E6F1FB" : "#fff",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    textAlign: "left",
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {pack.popular && !isSelected && (
                    <span style={{
                      position: "absolute",
                      top: -9,
                      right: 16,
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#27500A",
                      background: "#EAF3DE",
                      border: "1px solid #C0DD97",
                      borderRadius: 10,
                      padding: "2px 8px",
                    }}>
                      Phổ biến nhất
                    </span>
                  )}

                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#1B3A5C", margin: 0 }}>
                      {pack.name}
                    </p>
                    <p style={{ fontSize: 12, color: "#5F5E5A", margin: 0 }}>
                      {pack.credits} tài liệu · {pack.perDoc}/tài liệu
                    </p>
                  </div>

                  <span style={{ fontSize: 18, fontWeight: 700, color: "#1B3A5C", whiteSpace: "nowrap" }}>
                    {pack.priceVnd}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PayOS inline QR checkout */}
        {selectedPack && (
          <div style={{ padding: "0 28px", marginBottom: 20 }}>
            <PayOSCheckout
              packId={selectedPack.id}
              packName={selectedPack.name}
              priceLabel={selectedPack.priceVnd}
              credits={selectedPack.credits}
            />
          </div>
        )}

        {/* Actions */}
        <div style={{
          padding: "16px 28px 24px",
          borderTop: "1px solid #F1EFE8",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          alignItems: "center",
        }}>
          {!selectedPack && (
            <Button
              variant="primary"
              arrow
              onClick={() => setSelectedPack(PACKS.find((p) => p.popular) ?? PACKS[1])}
              style={{ width: "100%", justifyContent: "center" }}
            >
              Mua lượt ngay
            </Button>
          )}

          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
            <button
              type="button"
              onClick={() => {
                const pack = selectedPack ?? PACKS[1];
                handleStripe(pack);
              }}
              disabled={!!loadingStripe}
              style={{
                background: "none",
                border: "none",
                color: "#185FA5",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                fontSize: 13,
              }}
            >
              {loadingStripe ? "Đang xử lý…" : "Thanh toán bằng thẻ quốc tế (USD)"}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              style={{
                background: "none",
                border: "none",
                color: "#5F5E5A",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Để sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
