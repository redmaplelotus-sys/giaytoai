"use client";

import type { Editor } from "@tiptap/react";
import { useRefinement, type RefinementAction } from "@/hooks/useRefinement";
import { useT } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Button config
// ---------------------------------------------------------------------------

interface ButtonDef {
  action:   RefinementAction;
  labelKey: string;
  titleKey: string;
  icon:     string;
  mode:     "replace" | "analysis";
}

const BUTTONS: ButtonDef[] = [
  { action: "moreFormal",   labelKey: "moreFormal",   titleKey: "moreFormalTitle",   icon: "🎩", mode: "replace"  },
  { action: "expand",       labelKey: "expand",       titleKey: "expandTitle",       icon: "⤢",  mode: "replace"  },
  { action: "shorten",      labelKey: "shorten",      titleKey: "shortenTitle",      icon: "⤡",  mode: "replace"  },
  { action: "addKeywords",  labelKey: "addKeywords",  titleKey: "addKeywordsTitle",  icon: "🔑", mode: "replace"  },
  { action: "cultureCheck", labelKey: "cultureCheck", titleKey: "cultureCheckTitle", icon: "🌏", mode: "analysis" },
  { action: "fixEnglish",   labelKey: "fixEnglish",   titleKey: "fixEnglishTitle",   icon: "✏️", mode: "replace"  },
];

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Feedback panel (cultureCheck result)
// ---------------------------------------------------------------------------

function CultureFeedbackPanel({ text, onClose }: { text: string; onClose: () => void }) {
  const t = useT("refinement");
  return (
    <div
      style={{
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-default)",
        background: "var(--color-bg-subtle)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--color-border-default)" }}
      >
        <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
          🌏 {t("cultureCheckHeading")}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost"
          style={{ padding: "2px 6px", fontSize: 12 }}
          aria-label={t("closeFeedback")}
        >
          ✕
        </button>
      </div>
      <div className="px-4 py-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--color-text-body)" }}>
          {text}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RefinementToolbar
// ---------------------------------------------------------------------------

interface RefinementToolbarProps {
  editor:  Editor | null;
  draftId: string | null | undefined;
}

export function RefinementToolbar({ editor, draftId }: RefinementToolbarProps) {
  const t = useT("refinement");
  const { state, refine, clearFeedback, abort } = useRefinement(editor, draftId);
  const { status, activeAction, feedback, error } = state;
  const isBusy = status === "loading";

  return (
    <div className="space-y-2">
      {/* ── Button row ── */}
      <div className="flex flex-wrap gap-1.5">
        {BUTTONS.map(({ action, labelKey, titleKey, icon }) => {
          const isActive   = isBusy && activeAction === action;
          const isDisabled = isBusy && activeAction !== action;

          return (
            <button
              key={action}
              type="button"
              title={t(titleKey as "moreFormalTitle")}
              disabled={isDisabled || !draftId}
              onClick={() => isActive ? abort() : refine(action)}
              className={`btn-pill ${isActive ? "btn-pill-active" : ""}`}
            >
              {isActive ? <Spinner /> : <span aria-hidden="true">{icon}</span>}
              {t(labelKey as "moreFormal")}
              {isActive && (
                <span style={{ color: "rgba(255,255,255,0.6)", marginLeft: 2 }}>· {t("stop")}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Error toast ── */}
      {status === "error" && error && (
        <p className="text-xs" style={{ color: "var(--color-red)" }}>{error}</p>
      )}

      {/* ── Culture check feedback panel ── */}
      {feedback && (
        <CultureFeedbackPanel text={feedback} onClose={clearFeedback} />
      )}
    </div>
  );
}
