import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main
      style={{
        display: "flex",
        minHeight: "100vh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: "64px 16px",
        background: "#FAFAFA",
      }}
    >
      <div style={{ maxWidth: 360, width: "100%" }}>
        {/* Free credits banner */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #C0DD97",
            background: "#EAF3DE",
            padding: "12px 16px",
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, color: "#27500A", margin: "0 0 4px" }}>
            🎁 Tặng 2 tài liệu miễn phí khi đăng ký
          </p>
          <p style={{ fontSize: 13, color: "#3D6012", margin: 0, lineHeight: 1.5 }}>
            Soạn thảo ngay personal statement, cover letter, hay bài luận học bổng — không cần thẻ tín dụng.
          </p>
        </div>

        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#1B3A5C",
              letterSpacing: "-0.02em",
              margin: "0 0 6px",
            }}
          >
            Tạo tài khoản
          </h1>
          <p style={{ fontSize: 14, color: "#5F5E5A", margin: 0, lineHeight: 1.6 }}>
            Bắt đầu hành trình du học cùng Giấy Tờ AI.
          </p>
        </div>
      </div>

      <SignUp />
    </main>
  );
}
