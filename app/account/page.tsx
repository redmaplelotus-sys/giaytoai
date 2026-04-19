"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";

export default function AccountPage() {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "deleting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setStep("deleting");
    setError(null);

    try {
      const res = await fetch("/api/users/delete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Lỗi ${res.status}`);
      }
      setStep("done");
      // Sign out and redirect after 3 seconds
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      setStep("confirm");
    }
  }

  if (step === "done") {
    return (
      <main style={containerStyle}>
        <Image src="/logo.svg" alt="Giấy Tờ AI" width={160} height={48} style={{ height: 44, width: "auto", marginBottom: 32 }} />
        <p style={{ fontSize: 48, marginBottom: 16 }}>👋</p>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1B3A5C", marginBottom: 8 }}>
          Tài khoản đã được xóa
        </h1>
        <p style={{ fontSize: 14, color: "#5F5E5A", marginBottom: 8, lineHeight: 1.5 }}>
          Dữ liệu cá nhân đã được xóa ngay lập tức. Tài khoản sẽ được xóa hoàn toàn sau 30 ngày.
        </p>
        <p style={{ fontSize: 14, color: "#5F5E5A" }}>
          Email xác nhận đã được gửi đến <strong>{user?.primaryEmailAddress?.emailAddress}</strong>.
        </p>
        <p style={{ fontSize: 12, color: "#999", marginTop: 16 }}>Đang chuyển hướng…</p>
      </main>
    );
  }

  return (
    <main style={{ width: "100%", maxWidth: 600, marginLeft: "auto", marginRight: "auto", paddingTop: 48, paddingBottom: 64, paddingLeft: "clamp(20px, 4vw, 48px)", paddingRight: "clamp(20px, 4vw, 48px)" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1B3A5C", marginBottom: 32 }}>
        Tài khoản
      </h1>

      {/* Account info */}
      <div style={{ padding: "20px 24px", borderRadius: 12, border: "1px solid #E8E8E4", background: "#fff", marginBottom: 32 }}>
        <p style={{ fontSize: 14, color: "#5F5E5A", marginBottom: 4 }}>Email</p>
        <p style={{ fontSize: 15, fontWeight: 500, color: "#1B3A5C" }}>
          {user?.primaryEmailAddress?.emailAddress ?? "—"}
        </p>
      </div>

      {/* Danger zone */}
      <div style={{ padding: "20px 24px", borderRadius: 12, border: "1px solid #F0B8B8", background: "#FEF2F2" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#B91C1C", marginBottom: 8 }}>
          Vùng nguy hiểm
        </h2>
        <p style={{ fontSize: 14, color: "#444441", lineHeight: 1.5, marginBottom: 16 }}>
          Xóa tài khoản sẽ xóa ngay lập tức toàn bộ thông tin cá nhân (tên, email, CV).
          Tài liệu và dữ liệu còn lại sẽ được xóa hoàn toàn sau 30 ngày.
          Hành động này không thể hoàn tác.
        </p>

        {step === "idle" && (
          <button
            type="button"
            onClick={() => setStep("confirm")}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid #B91C1C",
              background: "#fff",
              color: "#B91C1C",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Xóa tài khoản và toàn bộ dữ liệu
          </button>
        )}

        {step === "confirm" && (
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#B91C1C", marginBottom: 12 }}>
              Bạn có chắc chắn? Hành động này không thể hoàn tác.
            </p>
            {error && (
              <p style={{ fontSize: 13, color: "#B91C1C", marginBottom: 12 }}>{error}</p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "#B91C1C",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Xác nhận xóa tài khoản
              </button>
              <button
                type="button"
                onClick={() => { setStep("idle"); setError(null); }}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "1px solid #E8E8E4",
                  background: "#fff",
                  color: "#5F5E5A",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {step === "deleting" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: "#F0B8B8", borderTopColor: "#B91C1C" }} />
            <span style={{ fontSize: 14, color: "#B91C1C" }}>Đang xóa tài khoản…</span>
          </div>
        )}
      </div>
    </main>
  );
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  padding: "40px 20px",
  textAlign: "center",
  background: "#FAFAFA",
};
