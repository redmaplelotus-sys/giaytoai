"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { SessionList } from "./SessionList";
import type { getUserSessions } from "@/lib/db/sessions";

type SessionRow = Awaited<ReturnType<typeof getUserSessions>>[number];

// ---------------------------------------------------------------------------
// Pack display info (must match lib/stripe.ts)
// ---------------------------------------------------------------------------
const PACK_INFO: Record<string, { name: string; credits: string; price: string }> = {
  starter:   { name: "Starter",   credits: "5",           price: "$4" },
  standard:  { name: "Standard",  credits: "15",          price: "$8" },
  pro:       { name: "Pro",       credits: "40",          price: "$16" },
  unlimited: { name: "Unlimited", credits: "không giới hạn", price: "$12/tháng" },
};

// ---------------------------------------------------------------------------
// Checkout success banner
// ---------------------------------------------------------------------------
function CheckoutSuccessBanner({ packId, onDismiss }: { packId: string; onDismiss: () => void }) {
  const pack = PACK_INFO[packId];
  if (!pack) return null;

  const isUnlimited = packId === "unlimited";

  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid #C0DD97",
        background: "#EAF3DE",
        padding: "16px 20px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#27500A", margin: "0 0 4px" }}>
          🎉 Thanh toán thành công!
        </p>
        <p style={{ fontSize: 14, color: "#3D6012", margin: 0, lineHeight: 1.5 }}>
          {isUnlimited
            ? `Gói ${pack.name} đã được kích hoạt — bạn có thể tạo tài liệu không giới hạn.`
            : `${pack.credits} lượt tài liệu đã được thêm vào tài khoản của bạn (gói ${pack.name}).`}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#3D6012", padding: "0 4px", flexShrink: 0 }}
        aria-label="Đóng"
      >
        ✕
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function DashboardClient({ sessions }: { sessions: SessionRow[] }) {
  const t = useT("history");
  const searchParams = useSearchParams();
  const router = useRouter();
  const trackedRef = useRef(false);

  const checkoutStatus = searchParams.get("checkout");
  const packId = searchParams.get("pack");
  const [showBanner, setShowBanner] = useState(checkoutStatus === "success" && !!packId);

  // Fire PostHog event once on checkout success
  useEffect(() => {
    if (checkoutStatus === "success" && packId && !trackedRef.current) {
      trackedRef.current = true;
      const pack = PACK_INFO[packId];
      posthog.capture("payment_completed", {
        pack_id: packId,
        pack_name: pack?.name ?? packId,
        credits_added: packId === "unlimited" ? "unlimited" : pack?.credits ?? "unknown",
        price: pack?.price ?? "unknown",
      });
    }
  }, [checkoutStatus, packId]);

  function handleDismiss() {
    setShowBanner(false);
    // Clean up query params
    router.replace("/dashboard", { scroll: false });
  }

  return (
    <main className="space-y-6" style={{ width: "100%", maxWidth: 1100, marginLeft: "auto", marginRight: "auto", paddingTop: 40, paddingBottom: 40, paddingLeft: "clamp(20px, 4vw, 48px)", paddingRight: "clamp(20px, 4vw, 48px)" }}>
      {showBanner && packId && (
        <CheckoutSuccessBanner packId={packId} onDismiss={handleDismiss} />
      )}

      <div className="flex items-center justify-between">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
          {t("heading")}
        </h1>
        <Button variant="primary" size="sm" arrow href="/dashboard/new">
          {t("newDocument")}
        </Button>
      </div>

      <SessionList sessions={sessions} />
    </main>
  );
}
