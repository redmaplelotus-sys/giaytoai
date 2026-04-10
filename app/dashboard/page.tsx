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
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Document history
        </h1>
        <Link
          href="/dashboard/new"
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
        >
          + New document
        </Link>
      </div>

      <SessionList sessions={sessions} />
    </main>
  );
}
