import Image from "next/image";

export default function OutcomeThanksPage() {
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

      <p style={{ fontSize: 48, marginBottom: 16 }}>🙏</p>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1B3A5C", marginBottom: 8 }}>
        Cảm ơn bạn đã phản hồi!
      </h1>

      <p style={{ fontSize: 13, color: "#999", marginTop: 16 }}>
        Bạn có thể đóng trang này.
      </p>
    </main>
  );
}
