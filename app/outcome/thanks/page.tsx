"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";

const MESSAGES: Record<string, { emoji: string; vi: string; en: string }> = {
  accepted:      { emoji: "🎉", vi: "Chúc mừng bạn! Cảm ơn đã chia sẻ kết quả.",           en: "Congratulations! Thanks for sharing your result." },
  pending:       { emoji: "⏳", vi: "Chúc bạn may mắn! Cảm ơn đã phản hồi.",               en: "Good luck! Thanks for letting us know." },
  rejected:      { emoji: "💪", vi: "Đừng bỏ cuộc — cơ hội tiếp theo sẽ tốt hơn. Cảm ơn bạn!", en: "Don't give up — the next opportunity will be better. Thank you!" },
  changed_plans: { emoji: "🔄", vi: "Cảm ơn bạn đã cho chúng tôi biết!",                    en: "Thanks for letting us know!" },
};

function ThanksContent() {
  const searchParams = useSearchParams();
  const outcome = searchParams.get("outcome") ?? "pending";
  const msg = MESSAGES[outcome] ?? MESSAGES.pending;

  return (
    <main style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "40px 20px",
      textAlign: "center",
      background: "#FAFAFA",
    }}>
      <Image
        src="/logo.svg"
        alt="Giấy Tờ AI"
        width={160}
        height={48}
        style={{ height: 44, width: "auto", marginBottom: 32 }}
      />

      <p style={{ fontSize: 48, marginBottom: 16 }}>{msg.emoji}</p>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1B3A5C", marginBottom: 8 }}>
        {msg.vi}
      </h1>
      <p style={{ fontSize: 15, color: "#5F5E5A", marginBottom: 32 }}>
        {msg.en}
      </p>

      <p style={{ fontSize: 13, color: "#999" }}>
        Bạn có thể đóng trang này.
      </p>
    </main>
  );
}

export default function OutcomeThanksPage() {
  return (
    <Suspense fallback={null}>
      <ThanksContent />
    </Suspense>
  );
}
