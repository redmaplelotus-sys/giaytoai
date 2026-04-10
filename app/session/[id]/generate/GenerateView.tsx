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
            className={[
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              isActive
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
            ].join(" ")}
          >
            v{i + 1}
            {isLoading && (
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
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

const PHASE_DOT: Record<GeneratePhase, string> = {
  idle:       "bg-neutral-300 dark:bg-neutral-600",
  connecting: "bg-amber-400 animate-pulse",
  streaming:  "bg-blue-500 animate-pulse",
  complete:   "bg-green-500",
  error:      "bg-red-500",
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
  // Cache by draft id so switching revisions refetches automatically
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
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-700">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          🇻🇳 Tiếng Việt
        </span>
      </div>
      <div className="px-4 py-3">
        {loading && (
          <p className="text-sm text-neutral-400 animate-pulse">{t("translating")}</p>
        )}
        {error && (
          <p className="text-sm text-red-500">{t("translateError")}</p>
        )}
        {translation && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
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

  // ── Revision history ──────────────────────────────────────────────────────
  const [revisions, setRevisions]       = useState<DraftRevision[]>([]);
  const [activeIndex, setActiveIndex]   = useState(0);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // ── Translation panel ─────────────────────────────────────────────────────
  const [showTranslation, setShowTranslation] = useState(false);
  // Lifted from TranslationPanel so DocumentToolbar can offer bilingual export
  const [translationText, setTranslationText] = useState<string | null>(null);

  // ── Tiptap editor ─────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: t("heading") }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral dark:prose-invert max-w-none min-h-[24rem] " +
          "focus:outline-none px-4 py-3 text-sm leading-relaxed",
      },
    },
    content: "",
    immediatelyRender: false,
  });

  const { state, generate, abort } = useGenerateStream(editor);
  const { phase, safety, quality, timing, error, draftId, inputTokens, outputTokens } = state;
  const isStreaming = phase === "connecting" || phase === "streaming";

  // ── Save current editor content as a new manual revision ─────────────────
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

  // ── Load existing drafts on mount ─────────────────────────────────────────
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

  // ── Auto-start generation when history is loaded and there are no drafts ──
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (!historyLoaded || !editor || hasAutoStarted.current) return;
    if (revisions.length === 0) {
      hasAutoStarted.current = true;
      generate(`/api/sessions/${sessionId}/generate`);
    } else {
      // Populate editor with the latest revision
      editor.commands.setContent(revisions[revisions.length - 1].text);
    }
  }, [historyLoaded, editor, revisions, sessionId, generate]);

  // ── When a new generation completes, append to revision list ─────────────
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

  // ── Switching revisions loads that revision into the editor ───────────────
  const handleSelectRevision = useCallback((index: number) => {
    if (isStreaming) return;
    setActiveIndex(index);
    const rev = revisions[index];
    if (rev && editor) {
      editor.commands.setContent(rev.text);
    }
  }, [revisions, editor, isStreaming]);

  // ── Active revision metadata ──────────────────────────────────────────────
  const activeRevision = revisions[activeIndex] ?? null;
  const activeQuality  = phase === "complete" && activeIndex === revisions.length - 1
    ? quality                    // fresh quality from last stream
    : activeRevision?.quality;   // stored quality for older revisions

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">

      {/* ── Top toolbar ── */}
      <div className="flex items-center justify-between gap-3">

        {/* Left: phase indicator + version tabs */}
        <div className="flex items-center gap-3 min-w-0">
          <span className={`shrink-0 inline-block h-2 w-2 rounded-full ${PHASE_DOT[phase]}`} />
          <RevisionTabs
            revisions={revisions}
            activeIndex={activeIndex}
            onSelect={handleSelectRevision}
            streaming={isStreaming}
          />
          {revisions.length === 0 && isStreaming && (
            <span className="text-sm font-medium text-neutral-500 truncate">
              {t("heading")}
            </span>
          )}
          {phase === "complete" && (
            <span className="text-sm font-medium truncate">{t("done")}</span>
          )}
          {phase === "error" && (
            <span className="text-sm text-red-500 truncate">{error}</span>
          )}
        </div>

        {/* Right: timing + actions */}
        <div className="flex shrink-0 items-center gap-3">
          {timing.firstTokenMs !== null && (
            <span className="hidden sm:inline text-xs text-neutral-400 tabular-nums">
              {t("ttft")}{" "}
              {timing.firstTokenMs < 1000
                ? `${timing.firstTokenMs}ms`
                : `${(timing.firstTokenMs / 1000).toFixed(1)}s`}
            </span>
          )}
          {timing.totalMs !== null && phase === "complete" && (
            <span className="hidden sm:inline text-xs text-neutral-400 tabular-nums">
              {t("totalTime")}{" "}
              {timing.totalMs < 1000
                ? `${timing.totalMs}ms`
                : `${(timing.totalMs / 1000).toFixed(1)}s`}
            </span>
          )}

          {isStreaming ? (
            <button
              type="button"
              onClick={abort}
              className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              {t("abort")}
            </button>
          ) : revisions.length === 0 ? (
            <button
              type="button"
              onClick={() => generate(`/api/sessions/${sessionId}/generate`)}
              disabled={!historyLoaded}
              className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white
                         hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed
                         dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {t("heading")}
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={saveVersion}
                disabled={saving}
                className="rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-neutral-200
                           text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed
                           dark:ring-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {saving ? t("saving") : t("saveVersion")}
              </button>
              <button
                type="button"
                onClick={() => generate(`/api/sessions/${sessionId}/generate`)}
                className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white
                           hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {t("newVersion")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Safety warning ── */}
      {safety && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {t("revisePrompt")}
          </p>
          {safety.reason && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">{safety.reason}</p>
          )}
        </div>
      )}

      {/* ── Editor ── */}
      <div
        className={[
          "rounded-xl border bg-white transition-colors dark:bg-neutral-900",
          isStreaming
            ? "border-blue-200 dark:border-blue-800"
            : phase === "error"
              ? "border-red-200 dark:border-red-800"
              : "border-neutral-200 dark:border-neutral-700",
        ].join(" ")}
      >
        <EditorContent editor={editor} />
      </div>

      {/* ── Document toolbar: word count, progress, translate, export ── */}
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

      {/* ── Quality badges — polls until populated, seeds from SSE if available ── */}
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
        <p className="text-center text-xs text-neutral-400">
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
