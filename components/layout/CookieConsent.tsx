"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Cookie consent banner — PDPL compliant
//
// - Not pre-ticked (user must actively consent)
// - Links to privacy notice
// - Stores consent in localStorage + DB (if signed in)
// - Only shows analytics/tracking after consent
// ---------------------------------------------------------------------------

const CONSENT_KEY = "giaytoai_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already consented or declined
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  async function handleAccept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);

    // Save consent to DB if user is signed in
    try {
      await fetch("/api/users/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: "accepted", consentedAt: new Date().toISOString() }),
      });
    } catch {
      // Non-fatal — localStorage consent is sufficient
    }
  }

  function handleDecline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);

    // Save decline to DB
    fetch("/api/users/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: "declined", consentedAt: new Date().toISOString() }),
    }).catch(() => {});
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#fff",
        borderTop: "1px solid #E8E8E4",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.1)",
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <p style={{ fontSize: 14, color: "#444441", lineHeight: 1.5, margin: 0, flex: 1, minWidth: 240 }}>
          Chúng tôi sử dụng cookie và dịch vụ phân tích để cải thiện trải nghiệm của bạn.
          Dữ liệu được xử lý theo{" "}
          <Link href="/privacy" style={{ color: "#185FA5", textDecoration: "underline", textUnderlineOffset: 3 }}>
            Chính sách Bảo mật
          </Link>
          .
        </p>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleDecline}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #E8E8E4",
              background: "#fff",
              color: "#5F5E5A",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Từ chối
          </button>
          <button
            type="button"
            onClick={handleAccept}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "#1B3A5C",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Đồng ý
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Check if user has consented to analytics/tracking.
 * Call this before initializing PostHog or other tracking.
 */
export function hasConsented(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "accepted";
}
