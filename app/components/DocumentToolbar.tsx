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

  let barColor: string;
  if (pct >= 90 && pct <= 115) {
    barColor = "var(--color-green)";
  } else if (pct >= 70) {
    barColor = "var(--color-amber)";
  } else {
    barColor = "var(--color-border-strong)";
  }

  return (
    <div
      className="flex items-center gap-2"
      title={`${current} / ${target} words (${pct}%)`}
    >
      <div
        className="overflow-hidden"
        style={{ width: 96, height: 6, borderRadius: 9999, background: "var(--color-border-default)" }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 9999,
            width: `${pct}%`,
            background: barColor,
            transition: "width 0.3s",
          }}
        />
      </div>
      <span className="tabular-nums text-xs" style={{ color: "var(--color-text-muted)" }}>
        {current}
        <span style={{ color: "var(--color-border-strong)" }}>/{target}</span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export button
// ---------------------------------------------------------------------------

const FORMAT_CONFIG: Record<ExportFormat, { label: string; icon: string; title: string }> = {
  docx:      { label: "Word",    icon: "⬇", title: "Download as Word (.docx)"        },
  bilingual: { label: "EN | VI", icon: "⬇", title: "Download bilingual Word (.docx)" },
  html:      { label: "HTML",    icon: "⬇", title: "Download as HTML file"           },
  pdf:       { label: "PDF",     icon: "⬇", title: "Download as PDF"                 },
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
      className="btn-pill"
    >
      {loading
        ? <span
            className="inline-block h-3 w-3 animate-spin rounded-full border-2"
            style={{ borderColor: "var(--color-border-strong)", borderTopColor: "transparent" }}
          />
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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">

        {/* Left: word count + progress */}
        <div className="flex items-center gap-3">
          {targetWordCount ? (
            <ProgressBar current={wordCount} target={targetWordCount} />
          ) : (
            <span className="tabular-nums text-xs" style={{ color: "var(--color-text-muted)" }}>
              {wordCount} words
            </span>
          )}
        </div>

        {/* Right: translation toggle + export buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleTranslation}
            className={`btn-pill ${showTranslation ? "btn-pill-active" : ""}`}
          >
            🇻🇳 {showTranslation ? "Hide translation" : "Translate"}
          </button>

          <span
            className="h-4 w-px"
            style={{ background: "var(--color-border-default)" }}
            aria-hidden="true"
          />

          {(["docx", "html", "pdf"] as ExportFormat[]).map((fmt) => (
            <ExportButton
              key={fmt}
              format={fmt}
              loading={isExporting && exportState.format === fmt}
              disabled={isExporting || !draftId}
              onClick={() => handleExport(fmt)}
            />
          ))}
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
        <p className="text-xs" style={{ color: "var(--color-red)" }}>{exportState.error}</p>
      )}
    </div>
  );
}
