import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
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
      <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "#1B3A5C",
            letterSpacing: "-0.02em",
            margin: "0 0 8px",
          }}
        >
          Chào mừng trở lại
        </h1>
        <p style={{ fontSize: 14, color: "#5F5E5A", margin: 0, lineHeight: 1.6 }}>
          Đăng nhập để tiếp tục soạn thảo hồ sơ du học của bạn với sự hỗ trợ của AI.
        </p>
      </div>

      <SignIn />
    </main>
  );
}
