"use client";

import { useState } from "react";
import Link from "next/link";
import type { getUserSessions } from "@/lib/db/sessions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SessionRow = Awaited<ReturnType<typeof getUserSessions>>[number];

// Supabase returns nested one-to-many as arrays; one-to-one as object or null.
type DocType  = { slug: string; name_en: string; name_vi: string };
type DraftRow = { id: string; created_at: string };
type ExportRow = { id: string; format: string; r2_key: string | null; created_at: string };

// ---------------------------------------------------------------------------
// Static lookups
// ---------------------------------------------------------------------------

const DESTINATION_MAP: Record<string, { flag: string; name: string }> = {
  au: { flag: "🇦🇺", name: "Australia"  },
  us: { flag: "🇺🇸", name: "USA"        },
  uk: { flag: "🇬🇧", name: "UK"         },
  ko: { flag: "🇰🇷", name: "Korea"      },
  cn: { flag: "🇨🇳", name: "China"      },
  ca: { flag: "🇨🇦", name: "Canada"     },
  de: { flag: "🇩🇪", name: "Germany"    },
  jp: { flag: "🇯🇵", name: "Japan"      },
  vn: { flag: "🇻🇳", name: "Vietnam"    },
  sg: { flag: "🇸🇬", name: "Singapore"  },
  fr: { flag: "🇫🇷", name: "France"     },
};

const STATUS_STYLE: Record<string, string> = {
  pending:    "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  processing: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  completed:  "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  failed:     "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  pending:    "Pending",
  processing: "Processing",
  completed:  "Completed",
  failed:     "Failed",
};

// ---------------------------------------------------------------------------
// Re-download button
// ---------------------------------------------------------------------------

function ReDownloadButton({ exportId }: { exportId: string }) {
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
      title={state === "error" ? "Download failed — try again" : "Re-download file"}
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        "ring-1 ring-inset transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        state === "error"
          ? "bg-red-50 text-red-600 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800"
          : "bg-white text-neutral-600 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-700 dark:hover:bg-neutral-800",
      ].join(" ")}
    >
      {state === "loading"
        ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
        : <span aria-hidden="true">⬇</span>
      }
      {state === "error" ? "Retry" : "Download"}
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
  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700 py-16 text-center">
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          You don&apos;t have any documents yet.
        </p>
        <Link
          href="/dashboard/new"
          className="mt-4 inline-block rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Create your first document
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      {/* Table header — hidden on mobile */}
      <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-neutral-400 sm:grid">
        <span>Document</span>
        <span>Destination</span>
        <span>Date</span>
        <span>Status</span>
        <span />
      </div>

      {sessions.map((session, i) => {
        const answers     = (session.answers ?? {}) as Record<string, unknown>;
        const destCode    = typeof answers.destination === "string" ? answers.destination : null;
        const dest        = destCode ? DESTINATION_MAP[destCode] : null;
        const docType     = session.document_types as unknown as DocType | null;

        // Latest draft → "Continue" link target
        const drafts      = (session.drafts as DraftRow[] | null) ?? [];
        const latestDraft = drafts.sort((a, b) =>
          b.created_at.localeCompare(a.created_at))[0] ?? null;

        // Latest export with an r2_key → available for re-download
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

        return (
          <div
            key={session.id}
            className={[
              "grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center sm:gap-4",
              i < sessions.length - 1
                ? "border-b border-neutral-100 dark:border-neutral-800"
                : "",
            ].join(" ")}
          >
            {/* Document type */}
            <div className="min-w-0">
              <Link
                href={href}
                className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:underline"
              >
                {docType?.name_en ?? "Document"}
              </Link>
            </div>

            {/* Destination */}
            <div className="text-sm text-neutral-500 dark:text-neutral-400 sm:whitespace-nowrap">
              {dest
                ? <span>{dest.flag} {dest.name}</span>
                : <span className="text-neutral-300 dark:text-neutral-600">—</span>
              }
            </div>

            {/* Date */}
            <div className="text-xs text-neutral-400 dark:text-neutral-500 sm:whitespace-nowrap">
              {date}
            </div>

            {/* Status badge */}
            <div>
              <span className={[
                "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                STATUS_STYLE[status] ?? STATUS_STYLE.pending,
              ].join(" ")}>
                {STATUS_LABEL[status] ?? status}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link
                href={href}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-700 dark:hover:bg-neutral-800 transition-colors"
              >
                {latestDraft ? "Open" : "Continue"}
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
