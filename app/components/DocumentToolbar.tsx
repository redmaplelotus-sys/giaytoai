"use client";

import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { exportToPdf } from "@/lib/export-pdf";
import posthog from "posthog-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExportFormat = "pdf" | "docx" | "html" | "bilingual";

interface ExportState {
  format:  ExportFormat | null;
  status:  "idle" | "loading" | "error";
  error:   string | null;
}

interface DocumentToolbarProps {
  editor:              Editor | null;
  draftId:             string | null | undefined;
  targetWordCount?:    number | null;
  showTranslation:     boolean;
  onToggleTranslation: () => void;
  /** Vietnamese translation text — when provided, enables bilingual export. */
  vietnameseText?:     string | null;
}

// ---------------------------------------------------------------------------
// Word count helpers
// ---------------------------------------------------------------------------

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

interface ProgressBarProps {
  current: number;
  target:  number;
}

function ProgressBar({ current, target }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((current / target) * 100));

  let color: string;
  if (pct >= 90 && pct <= 115) {
    color = "bg-green-500";
  } else if (pct >= 70) {
    color = "bg-amber-400";
  } else {
    color = "bg-neutral-300 dark:bg-neutral-600";
  }

  return (
    <div
      className="flex items-center gap-2"
      title={`${current} / ${target} words (${pct}%)`}
    >
      <div className="h-1.5 w-24 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums text-xs text-neutral-500 dark:text-neutral-400">
        {current}<span className="text-neutral-300 dark:text-neutral-600">/{target}</span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export button
// ---------------------------------------------------------------------------

const FORMAT_CONFIG: Record<ExportFormat, { label: string; icon: string; title: string }> = {
  docx:      { label: "Word",      icon: "⬇",  title: "Download as Word (.docx)"             },
  bilingual: { label: "EN | VI",   icon: "⬇",  title: "Download bilingual Word (.docx)"      },
  html:      { label: "HTML",      icon: "⬇",  title: "Download as HTML file"                },
  pdf:       { label: "PDF",        icon: "⬇",  title: "Download as PDF"                      },
};

interface ExportButtonProps {
  format:   ExportFormat;
  loading:  boolean;
  disabled: boolean;
  onClick:  () => void;
}

function ExportButton({ format, loading, disabled, onClick }: ExportButtonProps) {
  const cfg = FORMAT_CONFIG[format];
  return (
    <button
      type="button"
      title={cfg.title}
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        "ring-1 ring-inset transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "bg-white text-neutral-600 ring-neutral-200 hover:bg-neutral-50 hover:text-neutral-900",
        "dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-700",
        "dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
      ].join(" ")}
    >
      {loading
        ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
        : <span aria-hidden="true">{cfg.icon}</span>
      }
      {cfg.label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// DocumentToolbar
// ---------------------------------------------------------------------------

export function DocumentToolbar({
  editor,
  draftId,
  targetWordCount,
  showTranslation,
  onToggleTranslation,
  vietnameseText,
}: DocumentToolbarProps) {
  const [wordCount,   setWordCount]   = useState(0);
  const [exportState, setExportState] = useState<ExportState>({ format: null, status: "idle", error: null });

  // ── Live word count ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!editor) return;

    const update = () => setWordCount(countWords(editor.getText()));
    // Initial value
    update();

    editor.on("update", update);
    return () => { editor.off("update", update); };
  }, [editor]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!editor || !draftId) return;

    const htmlContent = editor.getHTML();
    if (!htmlContent.trim()) return;

    setExportState({ format, status: "loading", error: null });

    // ── PDF: fully client-side via html2pdf.js ────────────────────────────
    if (format === "pdf") {
      try {
        await exportToPdf(htmlContent, { filename: "document.pdf" });
        posthog.capture("draft_downloaded", { draft_id: draftId, format: "pdf" });
        setExportState({ format: null, status: "idle", error: null });
      } catch {
        setExportState({ format, status: "error", error: "PDF export failed." });
      }
      return;
    }

    // ── DOCX / HTML / bilingual: server route ────────────────────────────
    try {
      const res = await fetch(`/api/drafts/${draftId}/export`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          format,
          htmlContent,
          ...(format === "bilingual" && { vietnameseText }),
        }),
      });

      if (!res.ok) {
        let message = `Error ${res.status}`;
        try { const b = await res.json() as { error?: string }; message = b.error ?? message; } catch {}
        setExportState({ format, status: "error", error: message });
        return;
      }

      const { url, filename: serverFilename } =
        await res.json() as { url: string; filename: string; expiresAt: string };

      // Trigger browser download from pre-signed R2 URL
      const a = Object.assign(document.createElement("a"), { href: url, download: serverFilename });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setExportState({ format, status: "error", error: "Download failed." });
      return;
    }

    setExportState({ format: null, status: "idle", error: null });
  }, [editor, draftId, vietnameseText]);

  const isExporting = exportState.status === "loading";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">

        {/* Left: word count + progress */}
        <div className="flex items-center gap-3">
          {targetWordCount ? (
            <ProgressBar current={wordCount} target={targetWordCount} />
          ) : (
            <span className="tabular-nums text-xs text-neutral-400 dark:text-neutral-500">
              {wordCount} words
            </span>
          )}
        </div>

        {/* Right: translation toggle + export buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Translation toggle */}
          <button
            type="button"
            onClick={onToggleTranslation}
            className={[
              "rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors",
              showTranslation
                ? "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:ring-indigo-800"
                : "bg-white text-neutral-600 ring-neutral-200 hover:bg-neutral-50 hover:text-neutral-900 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-700 dark:hover:bg-neutral-800",
            ].join(" ")}
          >
            🇻🇳 {showTranslation ? "Hide translation" : "Translate"}
          </button>

          {/* Divider */}
          <span className="h-4 w-px bg-neutral-200 dark:bg-neutral-700" aria-hidden="true" />

          {/* Export buttons */}
          {(["docx", "html", "pdf"] as ExportFormat[]).map((fmt) => (
            <ExportButton
              key={fmt}
              format={fmt}
              loading={isExporting && exportState.format === fmt}
              disabled={isExporting || !draftId}
              onClick={() => handleExport(fmt)}
            />
          ))}
          {/* Bilingual export — only when translation is available */}
          {vietnameseText && (
            <ExportButton
              format="bilingual"
              loading={isExporting && exportState.format === "bilingual"}
              disabled={isExporting || !draftId}
              onClick={() => handleExport("bilingual")}
            />
          )}
        </div>
      </div>

      {/* Export error */}
      {exportState.status === "error" && exportState.error && (
        <p className="text-xs text-red-500">{exportState.error}</p>
      )}
    </div>
  );
}
