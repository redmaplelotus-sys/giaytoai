import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserSessions } from "@/lib/db/sessions";
import { SessionList } from "./SessionList";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const sessions = await getUserSessions(userId);

  return (
    <main className="space-y-6" style={{ width: "100%", maxWidth: 1100, marginLeft: "auto", marginRight: "auto", paddingTop: 40, paddingBottom: 40, paddingLeft: "clamp(20px, 4vw, 48px)", paddingRight: "clamp(20px, 4vw, 48px)" }}>
      <div className="flex items-center justify-between">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
          Document history
        </h1>
        <Link href="/dashboard/new" className="btn-primary">
          + New document
        </Link>
      </div>

      <SessionList sessions={sessions} />
    </main>
  );
}
