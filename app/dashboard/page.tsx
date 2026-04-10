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
    <main className="page-container py-10 space-y-6">
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
