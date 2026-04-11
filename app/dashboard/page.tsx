import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserSessions } from "@/lib/db/sessions";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const sessions = await getUserSessions(userId);

  return <DashboardClient sessions={sessions} />;
}
