"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import posthog from "posthog-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CheckoutState = "idle" | "loading" | "qr" | "success" | "expired" | "error";

interface PayOSCheckoutProps {
  packId: string;
  packName: string;
  priceLabel: string;
  credits: number | null; // null = unlimited
}

const EXPIRE_MS = 15 * 60 * 1000; // 15 minutes
const POLL_MS   = 5_000;          // 5 seconds

// ---------------------------------------------------------------------------
// Countdown display
// ---------------------------------------------------------------------------

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const mins = Math.floor(ms / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PayOSCheckout({ packId, packName, priceLabel, credits }: PayOSCheckoutProps) {
  const router = useRouter();

  const [state, setState]         = useState<CheckoutState>("idle");
  const [qrUrl, setQrUrl]         = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(EXPIRE_MS);
  const [error, setError]         = useState<string | null>(null);

  const expiresAtRef = useRef<number>(0);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cleanup ─────────────────────────────────────────────────────────────
  const stopTimers = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => stopTimers(), [stopTimers]);

  // ── Create payment ─────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    setState("loading");
    setError(null);

    try {
      const res = await fetch("/api/checkout/payos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Lỗi ${res.status}`);
      }

      const data = await res.json() as {
        checkoutUrl: string;
        qrCode: string;
        orderCode: number;
        expiresAt: string;
      };

      setQrUrl(data.qrCode);
      setCheckoutUrl(data.checkoutUrl);
      setOrderCode(data.orderCode);
      expiresAtRef.current = Date.now() + EXPIRE_MS;
      setRemaining(EXPIRE_MS);
      setState("qr");

      // ── Countdown timer ───────────────────────────────────────────
      timerRef.current = setInterval(() => {
        const left = expiresAtRef.current - Date.now();
        if (left <= 0) {
          setState("expired");
          stopTimers();
          return;
        }
        setRemaining(left);
      }, 1000);

      // ── Status polling ────────────────────────────────────────────
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `/api/checkout/payos/status?orderCode=${data.orderCode}`,
          );
          if (!statusRes.ok) return;
          const statusData = await statusRes.json() as { status: string; credits?: number };

          if (statusData.status === "completed") {
            setState("success");
            stopTimers();
            posthog.capture("payment_completed", {
              pack_id: packId,
              pack_name: packName,
              provider: "payos",
              credits_added: credits === null ? "unlimited" : String(credits),
            });
            // Redirect after showing success briefly
            setTimeout(() => {
              router.push(`/dashboard?checkout=success&pack=${packId}&provider=payos`);
            }, 2000);
          } else if (statusData.status === "failed") {
            setState("error");
            setError("Thanh toán đã bị hủy.");
            stopTimers();
          }
        } catch { /* polling failure is non-fatal */ }
      }, POLL_MS);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  }, [packId, packName, credits, router, stopTimers]);

  // ── Retry ───────────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    stopTimers();
    setQrUrl(null);
    setCheckoutUrl(null);
    setOrderCode(null);
    setError(null);
    handleCreate();
  }, [stopTimers, handleCreate]);

  // ── Render ──────────────────────────────────────────────────────────────

  // Idle
  if (state === "idle") {
    return (
      <Button variant="primary" arrow onClick={handleCreate}>
        Thanh toán {priceLabel}
      </Button>
    );
  }

  // Loading
  if (state === "loading") {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div
          className="inline-block h-6 w-6 animate-spin rounded-full border-2"
          style={{ borderColor: "#E8E8E4", borderTopColor: "#1B3A5C" }}
        />
        <p style={{ fontSize: 14, color: "#5F5E5A", marginTop: 12 }}>
          Đang tạo mã thanh toán…
        </p>
      </div>
    );
  }

  // Success
  if (state === "success") {
    return (
      <div style={{
        textAlign: "center",
        padding: "32px 24px",
        borderRadius: 12,
        background: "#EAF3DE",
        border: "1px solid #C0DD97",
      }}>
        <p style={{ fontSize: 28, marginBottom: 8 }}>🎉</p>
        <p style={{ fontSize: 16, fontWeight: 600, color: "#27500A", marginBottom: 4 }}>
          Thanh toán thành công!
        </p>
        <p style={{ fontSize: 14, color: "#3D6012" }}>
          {credits !== null
            ? `${credits} lượt tài liệu đã được thêm vào tài khoản.`
            : "Gói Unlimited đã được kích hoạt."}
        </p>
        <p style={{ fontSize: 12, color: "#5F5E5A", marginTop: 8 }}>
          Đang chuyển hướng…
        </p>
      </div>
    );
  }

  // Error
  if (state === "error") {
    return (
      <div style={{
        textAlign: "center",
        padding: "24px",
        borderRadius: 12,
        border: "1px solid #F0B8B8",
        background: "#FEF2F2",
      }}>
        <p style={{ fontSize: 14, color: "#B91C1C", marginBottom: 12 }}>
          {error ?? "Có lỗi xảy ra"}
        </p>
        <Button variant="secondary" onClick={handleRetry}>
          Thử lại
        </Button>
      </div>
    );
  }

  // Expired
  if (state === "expired") {
    return (
      <div style={{
        textAlign: "center",
        padding: "24px",
        borderRadius: 12,
        border: "1px solid #FAC775",
        background: "#FEF8EE",
      }}>
        <p style={{ fontSize: 14, color: "#854F0B", marginBottom: 12 }}>
          Mã thanh toán đã hết hạn.
        </p>
        <Button variant="primary" arrow onClick={handleRetry}>
          Tạo mã mới
        </Button>
      </div>
    );
  }

  // QR state
  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid #E8E8E4",
      background: "#fff",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid #F1EFE8",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#1B3A5C", margin: 0 }}>
            {packName}
          </p>
          <p style={{ fontSize: 13, color: "#5F5E5A", margin: 0 }}>
            {credits !== null ? `${credits} tài liệu` : "Không giới hạn"} · {priceLabel}
          </p>
        </div>
        <div style={{
          background: remaining < 60_000 ? "#FEF2F2" : "#F7F7F5",
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 16,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          color: remaining < 60_000 ? "#B91C1C" : "#1B3A5C",
        }}>
          {formatCountdown(remaining)}
        </div>
      </div>

      {/* QR Code */}
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "#5F5E5A", marginBottom: 16 }}>
          Quét mã QR bằng ứng dụng ngân hàng
        </p>

        {qrUrl && (
          <div style={{
            display: "inline-block",
            padding: 12,
            borderRadius: 12,
            border: "1px solid #E8E8E4",
            background: "#fff",
            marginBottom: 16,
          }}>
            <Image
              src={qrUrl}
              alt="Mã QR thanh toán"
              width={220}
              height={220}
              style={{ width: 220, height: 220 }}
              unoptimized
            />
          </div>
        )}

        <p style={{ fontSize: 12, color: "#5F5E5A", marginBottom: 16 }}>
          Mã đơn hàng: <strong>{orderCode}</strong>
        </p>

        {/* Waiting indicator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginBottom: 16,
        }}>
          <span
            className="inline-block h-2 w-2 rounded-full animate-pulse"
            style={{ background: "#185FA5" }}
          />
          <span style={{ fontSize: 13, color: "#5F5E5A" }}>
            Đang chờ thanh toán…
          </span>
        </div>

        {/* Fallback link */}
        {checkoutUrl && (
          <p style={{ fontSize: 12, color: "#5F5E5A" }}>
            Không quét được?{" "}
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#185FA5", textDecoration: "underline" }}
            >
              Mở trang thanh toán
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
