import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link
          href="/dashboard"
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--color-navy)",
            textDecoration: "none",
            letterSpacing: "-0.01em",
          }}
        >
          Giấy Tờ AI
        </Link>
        <UserButton />
      </div>
    </header>
  );
}
