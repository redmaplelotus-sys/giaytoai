"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useT } from "@/lib/i18n";
import { useGenerateStream, type GeneratePhase } from "@/hooks/useGenerateStream";
import type { QualityReport } from "@/lib/ai/quality";
import { PollingQualityBadges } from "@/app/components/QualityBadges";
import { RefinementToolbar } from "@/app/components/RefinementToolbar";
import { DocumentToolbar } from "@/app/components/DocumentToolbar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DraftRevision {
  id: string;
  text: string;
  createdAt: string;
  quality: QualityReport | null;
}

// ---------------------------------------------------------------------------
// Revision tabs  (v1 · v2 · v3 …)
// ---------------------------------------------------------------------------

interface RevisionTabsProps {
  revisions: DraftRevision[];
  activeIndex: number;
  onSelect: (index: number) => void;
  streaming: boolean;
}

function RevisionTabs({ revisions, activeIndex, onSelect, streaming }: RevisionTabsProps) {
  if (revisions.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {revisions.map((rev, i) => {
        const isActive  = i === activeIndex;
        const isLatest  = i === revisions.length - 1;
        const isLoading = isLatest && streaming;
        return (
          <button
            key={rev.id}
            type="button"
            onClick={() => onSelect(i)}
            className={`btn-pill ${isActive ? "btn-pill-active" : ""}`}
            style={{ padding: "4px 10px", fontSize: 11 }}
          >
            v{i + 1}
            {isLoading && (
              <span
                className="ml-1 inline-block h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ background: "var(--color-blue)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase dot
// ---------------------------------------------------------------------------

const PHASE_DOT_COLOR: Record<GeneratePhase, string> = {
  idle:       "var(--color-border-strong)",
  connecting: "var(--color-amber)",
  streaming:  "var(--color-blue)",
  complete:   "var(--color-green)",
  error:      "var(--color-red)",
};

const PHASE_DOT_PULSE: Record<GeneratePhase, boolean> = {
  idle: false, connecting: true, streaming: true, complete: false, error: false,
};

// ---------------------------------------------------------------------------
// Translation panel
// ---------------------------------------------------------------------------

interface TranslationPanelProps {
  sessionId:    string;
  draftText:    string;
  draftId:      string;
  onTranslated: (text: string) => void;
}

function TranslationPanel({ sessionId, draftText, draftId, onTranslated }: TranslationPanelProps) {
  const t = useT("generation");
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const cacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!draftText) return;
    const cached = cacheRef.current.get(draftId);
    if (cached) {
      setTranslation(cached);
      onTranslated(cached);
      return;
    }
    setTranslation(null);
    setError(false);
    setLoading(true);

    fetch(`/api/sessions/${sessionId}/translate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text: draftText }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json() as Promise<{ translation: string }>;
      })
      .then(({ translation: text }) => {
        cacheRef.current.set(draftId, text);
        setTranslation(text);
        onTranslated(text);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, draftText, draftId]);

  return (
    <div
      style={{
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-default)",
        background: "var(--color-bg-subtle)",
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--color-border-default)" }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          🇻🇳 Tiếng Việt
        </span>
      </div>
      <div className="px-4 py-3">
        {loading && (
          <p className="text-sm animate-pulse" style={{ color: "var(--color-text-muted)" }}>{t("translating")}</p>
        )}
        {error && (
          <p className="text-sm" style={{ color: "var(--color-red)" }}>{t("translateError")}</p>
        )}
        {translation && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--color-text-body)" }}>
            {translation}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GenerateView({ sessionId, targetWordCount }: { sessionId: string; targetWordCount?: number | null }) {
  const t = useT("generation");

  const [revisions, setRevisions]         = useState<DraftRevision[]>([]);
  const [activeIndex, setActiveIndex]     = useState(0);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const [showTranslation, setShowTranslation] = useState(false);
  const [translationText, setTranslationText] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: t("heading") }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral max-w-none min-h-[24rem] " +
          "focus:outline-none px-4 py-3 text-sm leading-relaxed",
      },
    },
    content: "",
    immediatelyRender: false,
  });

  const { state, generate, abort } = useGenerateStream(editor);
  const { phase, safety, quality, timing, error, draftId, inputTokens, outputTokens } = state;
  const isStreaming = phase === "connecting" || phase === "streaming";

  const [saving, setSaving] = useState(false);
  const saveVersion = useCallback(async () => {
    if (!editor || saving) return;
    const text = editor.getText();
    const html = editor.getHTML();
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/drafts`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text, html }),
      });
      if (!res.ok) return;
      const saved = await res.json() as { id: string; created_at: string };
      setRevisions((prev) => {
        if (prev.some((r) => r.id === saved.id)) return prev;
        const next = [...prev, { id: saved.id, text: html, createdAt: saved.created_at, quality: null }];
        setActiveIndex(next.length - 1);
        return next;
      });
    } finally {
      setSaving(false);
    }
  }, [editor, sessionId, saving]);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/drafts`)
      .then((r) => r.json())
      .then((body: { drafts: Array<{ id: string; content: { text?: string; html?: string }; created_at: string; quality_data?: QualityReport | null }> }) => {
        const loaded: DraftRevision[] = (body.drafts ?? [])
          .filter((d) => d.content?.text)
          .map((d) => ({
            id:        d.id,
            text:      d.content.html ?? d.content.text!,
            createdAt: d.created_at,
            quality:   d.quality_data ?? null,
          }));
        setRevisions(loaded);
        setActiveIndex(Math.max(0, loaded.length - 1));
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
  }, [sessionId]);

  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (!historyLoaded || !editor || hasAutoStarted.current) return;
    if (revisions.length === 0) {
      hasAutoStarted.current = true;
      generate(`/api/sessions/${sessionId}/generate`);
    } else {
      editor.commands.setContent(revisions[revisions.length - 1].text);
    }
  }, [historyLoaded, editor, revisions, sessionId, generate]);

  useEffect(() => {
    if (phase !== "complete" || !draftId) return;
    const text = editor?.getText() ?? "";
    if (!text.trim()) return;

    setRevisions((prev) => {
      if (prev.some((r) => r.id === draftId)) return prev;
      const next = [...prev, {
        id:        draftId,
        text:      editor?.getHTML() ?? text,
        createdAt: new Date().toISOString(),
        quality,
      }];
      setActiveIndex(next.length - 1);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, draftId]);

  const handleSelectRevision = useCallback((index: number) => {
    if (isStreaming) return;
    setActiveIndex(index);
    const rev = revisions[index];
    if (rev && editor) {
      editor.commands.setContent(rev.text);
    }
  }, [revisions, editor, isStreaming]);

  const activeRevision = revisions[activeIndex] ?? null;
  const activeQuality  = phase === "complete" && activeIndex === revisions.length - 1
    ? quality
    : activeRevision?.quality;

  return (
    <div className="page-container space-y-4 py-10">

      {/* ── Top toolbar ── */}
      <div className="flex items-center justify-between gap-3">

        {/* Left: phase indicator + version tabs */}
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`shrink-0 inline-block h-2 w-2 rounded-full ${PHASE_DOT_PULSE[phase] ? "animate-pulse" : ""}`}
            style={{ background: PHASE_DOT_COLOR[phase] }}
          />
          <RevisionTabs
            revisions={revisions}
            activeIndex={activeIndex}
            onSelect={handleSelectRevision}
            streaming={isStreaming}
          />
          {revisions.length === 0 && isStreaming && (
            <span className="text-sm font-medium truncate" style={{ color: "var(--color-text-secondary)" }}>
              {t("heading")}
            </span>
          )}
          {phase === "complete" && (
            <span className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
              {t("done")}
            </span>
          )}
          {phase === "error" && (
            <span className="text-sm truncate" style={{ color: "var(--color-red)" }}>{error}</span>
          )}
        </div>

        {/* Right: timing + actions */}
        <div className="flex shrink-0 items-center gap-3">
          {timing.firstTokenMs !== null && (
            <span className="hidden sm:inline text-xs tabular-nums" style={{ color: "var(--color-text-hint)" }}>
              {t("ttft")}{" "}
              {timing.firstTokenMs < 1000
                ? `${timing.firstTokenMs}ms`
                : `${(timing.firstTokenMs / 1000).toFixed(1)}s`}
            </span>
          )}
          {timing.totalMs !== null && phase === "complete" && (
            <span className="hidden sm:inline text-xs tabular-nums" style={{ color: "var(--color-text-hint)" }}>
              {t("totalTime")}{" "}
              {timing.totalMs < 1000
                ? `${timing.totalMs}ms`
                : `${(timing.totalMs / 1000).toFixed(1)}s`}
            </span>
          )}

          {isStreaming ? (
            <button type="button" onClick={abort} className="btn-ghost" style={{ fontSize: 12 }}>
              {t("abort")}
            </button>
          ) : revisions.length === 0 ? (
            <button
              type="button"
              onClick={() => generate(`/api/sessions/${sessionId}/generate`)}
              disabled={!historyLoaded}
              className="btn-primary"
              style={{ padding: "6px 14px", fontSize: 12 }}
            >
              {t("heading")}
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={saveVersion}
                disabled={saving}
                className="btn-secondary"
                style={{ padding: "6px 14px", fontSize: 12 }}
              >
                {saving ? t("saving") : t("saveVersion")}
              </button>
              <button
                type="button"
                onClick={() => generate(`/api/sessions/${sessionId}/generate`)}
                className="btn-primary"
                style={{ padding: "6px 14px", fontSize: 12 }}
              >
                {t("newVersion")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Safety warning ── */}
      {safety && (
        <div
          className="px-4 py-3"
          style={{
            borderRadius: "var(--radius-md)",
            border: "1px solid #E8C88A",
            background: "var(--color-amber-light)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-amber)" }}>
            {t("revisePrompt")}
          </p>
          {safety.reason && (
            <p className="mt-1 text-xs" style={{ color: "var(--color-amber)" }}>{safety.reason}</p>
          )}
        </div>
      )}

      {/* ── Editor ── */}
      <div
        style={{
          borderRadius: "var(--radius-lg)",
          border: `1px solid ${
            isStreaming ? "var(--color-blue)"
            : phase === "error" ? "var(--color-red)"
            : "var(--color-border-default)"
          }`,
          background: "var(--color-bg-surface)",
          boxShadow: "var(--shadow-card)",
          transition: "border-color 0.2s",
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* ── Document toolbar ── */}
      {activeRevision && !isStreaming && (
        <DocumentToolbar
          editor={editor}
          draftId={activeRevision.id}
          targetWordCount={targetWordCount}
          showTranslation={showTranslation}
          onToggleTranslation={() => { setShowTranslation((v) => !v); if (showTranslation) setTranslationText(null); }}
          vietnameseText={translationText}
        />
      )}

      {/* ── Refinement toolbar ── */}
      {activeRevision && !isStreaming && (
        <RefinementToolbar editor={editor} draftId={activeRevision.id} />
      )}

      {/* ── Translation panel ── */}
      {showTranslation && activeRevision && !isStreaming && (
        <TranslationPanel
          sessionId={sessionId}
          draftText={activeRevision.text}
          draftId={activeRevision.id}
          onTranslated={setTranslationText}
        />
      )}

      {/* ── Quality badges ── */}
      {activeRevision && !isStreaming && (
        <PollingQualityBadges
          draftId={activeRevision.id}
          initialQuality={
            activeIndex === revisions.length - 1 ? quality : activeRevision.quality
          }
          showDetail
        />
      )}

      {/* ── Footer ── */}
      {(phase === "complete" || revisions.length > 0) && !isStreaming && (
        <p className="text-center text-xs" style={{ color: "var(--color-text-hint)" }}>
          {phase === "complete" && <>{t("creditsUsed")} · </>}
          {inputTokens !== null && outputTokens !== null && phase === "complete" && (
            <>{((inputTokens + outputTokens) / 1000).toFixed(1)}k tokens · </>
          )}
          {activeRevision && (
            <>v{activeIndex + 1} of {revisions.length}</>
          )}
        </p>
      )}
    </div>
  );
}
