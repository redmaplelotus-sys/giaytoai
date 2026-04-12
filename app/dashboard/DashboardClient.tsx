"use client";

import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { SessionList } from "./SessionList";
import type { getUserSessions } from "@/lib/db/sessions";

type SessionRow = Awaited<ReturnType<typeof getUserSessions>>[number];

export function DashboardClient({ sessions }: { sessions: SessionRow[] }) {
  const t = useT("history");

  return (
    <main className="space-y-6" style={{ width: "100%", maxWidth: 1100, marginLeft: "auto", marginRight: "auto", paddingTop: 40, paddingBottom: 40, paddingLeft: "clamp(20px, 4vw, 48px)", paddingRight: "clamp(20px, 4vw, 48px)" }}>
      <div className="flex items-center justify-between">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
          {t("heading")}
        </h1>
        <Button variant="primary" size="sm" arrow href="/dashboard/new">
          {t("newDocument")}
        </Button>
      </div>

      <SessionList sessions={sessions} />
    </main>
  );
}
