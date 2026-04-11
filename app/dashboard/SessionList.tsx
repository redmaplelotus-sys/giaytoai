"use client";

import { useState } from "react";
import Link from "next/link";
import { useT, useTA } from "@/lib/i18n";
import type { getUserSessions } from "@/lib/db/sessions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SessionRow = Awaited<ReturnType<typeof getUserSessions>>[number];

type DocType  = { slug: string; name_en: string; name_vi: string };
type DraftRow = { id: string; created_at: string };
type ExportRow = { id: string; format: string; r2_key: string | null; created_at: string };

// ---------------------------------------------------------------------------
// Static lookups
// ---------------------------------------------------------------------------

const DESTINATION_FLAGS: Record<string, string> = {
  au: "🇦🇺", us: "🇺🇸", uk: "🇬🇧", ko: "🇰🇷", cn: "🇨🇳",
  ca: "🇨🇦", de: "🇩🇪", jp: "🇯🇵", vn: "🇻🇳", sg: "🇸🇬", fr: "🇫🇷",
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:    { bg: "var(--color-bg-subtle)",   color: "var(--color-text-muted)"     },
  processing: { bg: "var(--color-blue-light)",  color: "var(--color-blue)"           },
  completed:  { bg: "var(--color-green-light)", color: "var(--color-green)"          },
  failed:     { bg: "var(--color-red-light)",   color: "var(--color-red)"            },
};

// ---------------------------------------------------------------------------
// Re-download button
// ---------------------------------------------------------------------------

function ReDownloadButton({ exportId }: { exportId: string }) {
  const t = useT("history");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function handleClick() {
    setState("loading");
    try {
      const res = await fetch(`/api/exports/${exportId}/url`);
      if (!res.ok) throw new Error("failed");
      const { url, filename } = await res.json() as { url: string; filename: string };
      const a = Object.assign(document.createElement("a"), { href: url, download: filename });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "loading"}
      title={state === "error" ? t("downloadFailed") : t("redownload")}
      className="btn-pill"
      style={state === "error" ? { background: "var(--color-red-light)", color: "var(--color-red)", borderColor: "#F0B8B8" } : {}}
    >
      {state === "loading"
        ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2" style={{ borderColor: "var(--color-border-strong)", borderTopColor: "transparent" }} />
        : <span aria-hidden="true">⬇</span>
      }
      {state === "error" ? t("retry") : t("download")}
    </button>
  );
}

// ---------------------------------------------------------------------------
// SessionList
// ---------------------------------------------------------------------------

export interface SessionListProps {
  sessions: SessionRow[];
}

export function SessionList({ sessions }: SessionListProps) {
  const t = useT("history");
  const m = useTA();

  if (sessions.length === 0) {
    return (
      <div
        className="py-16 text-center rounded-xl"
        style={{ border: "1.5px dashed var(--color-border-default)" }}
      >
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
          {t("empty")}
        </p>
        <Link href="/dashboard/new" className="btn-primary" style={{ marginTop: 16, display: "inline-flex" }}>
          {t("emptyAction")}
        </Link>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Table header — hidden on mobile */}
      <div
        className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-2.5 text-xs font-medium uppercase tracking-wider"
        style={{
          background: "var(--color-bg-subtle)",
          borderBottom: "1px solid var(--color-border-default)",
          color: "var(--color-text-muted)",
        }}
      >
        <span>{t("tableDocument")}</span>
        <span>{t("tableDestination")}</span>
        <span>{t("tableDate")}</span>
        <span>{t("tableStatus")}</span>
        <span />
      </div>

      {sessions.map((session, i) => {
        const answers     = (session.answers ?? {}) as Record<string, unknown>;
        const destCode    = typeof answers.destination === "string" ? answers.destination : null;
        const destFlag    = destCode ? DESTINATION_FLAGS[destCode] : null;
        const destName    = destCode ? (m.destinations as Record<string, string>)[destCode] : null;
        const docType     = session.document_types as unknown as DocType | null;

        const drafts      = (session.drafts as DraftRow[] | null) ?? [];
        const latestDraft = drafts.sort((a, b) =>
          b.created_at.localeCompare(a.created_at))[0] ?? null;

        const exports_    = (session.exports as ExportRow[] | null) ?? [];
        const latestExport = exports_
          .filter((e) => !!e.r2_key)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;

        const href = latestDraft
          ? `/session/${session.id}/generate`
          : `/session/${session.id}`;

        const date = new Date(session.created_at).toLocaleDateString(undefined, {
          year: "numeric", month: "short", day: "numeric",
        });

        const status = session.status as string;
        const statusStyle = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
        const statusLabel = (m.session.status as Record<string, string>)[status] ?? status;

        return (
          <div
            key={session.id}
            className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center sm:gap-4"
            style={i < sessions.length - 1 ? { borderBottom: "1px solid var(--color-border-subtle)" } : {}}
          >
            {/* Document type */}
            <div className="min-w-0">
              <Link
                href={href}
                className="block truncate text-sm font-medium hover:underline"
                style={{ color: "var(--color-text-primary)" }}
              >
                {docType?.name_vi ?? docType?.name_en ?? t("tableDocument")}
              </Link>
            </div>

            {/* Destination */}
            <div className="text-sm sm:whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>
              {destFlag && destName
                ? <span>{destFlag} {destName}</span>
                : <span style={{ color: "var(--color-text-hint)" }}>—</span>
              }
            </div>

            {/* Date */}
            <div className="text-xs sm:whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
              {date}
            </div>

            {/* Status badge */}
            <div>
              <span
                className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ background: statusStyle.bg, color: statusStyle.color }}
              >
                {statusLabel}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link href={href} className="btn-pill">
                {latestDraft ? t("open") : t("continue")}
              </Link>
              {latestExport && (
                <ReDownloadButton exportId={latestExport.id} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
