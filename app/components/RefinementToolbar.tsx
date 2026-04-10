"use client";

import type { Editor } from "@tiptap/react";
import { useRefinement, type RefinementAction } from "@/hooks/useRefinement";

// ---------------------------------------------------------------------------
// Button config
// ---------------------------------------------------------------------------

interface ButtonDef {
  action:  RefinementAction;
  label:   string;
  icon:    string;
  title:   string;
  /** "replace" — result streams into editor; "analysis" — result goes to panel */
  mode:    "replace" | "analysis";
}

const BUTTONS: ButtonDef[] = [
  {
    action:  "moreFormal",
    label:   "More Formal",
    icon:    "🎩",
    title:   "Rewrite in a more formal, professional academic register",
    mode:    "replace",
  },
  {
    action:  "expand",
    label:   "Expand",
    icon:    "⤢",
    title:   "Expand with ~25% more specific detail",
    mode:    "replace",
  },
  {
    action:  "shorten",
    label:   "Shorten",
    icon:    "⤡",
    title:   "Condense by ~25% without losing key points",
    mode:    "replace",
  },
  {
    action:  "addKeywords",
    label:   "Keywords",
    icon:    "🔑",
    title:   "Naturally integrate programme/role-relevant keywords",
    mode:    "replace",
  },
  {
    action:  "cultureCheck",
    label:   "Culture Check",
    icon:    "🌏",
    title:   "Analyse cultural fit: directness, evidence, framing",
    mode:    "analysis",
  },
  {
    action:  "fixEnglish",
    label:   "Fix English",
    icon:    "✏️",
    title:   "Fix grammar, articles, prepositions, and ESL errors",
    mode:    "replace",
  },
];

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg
      className="h-3 w-3 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Feedback panel (cultureCheck result)
// ---------------------------------------------------------------------------

function FeedbackPanel({
  text,
  onClose,
}: {
  text: string;
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-950/30">
      <div className="flex items-center justify-between border-b border-indigo-100 px-4 py-2.5 dark:border-indigo-900/50">
        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
          🌏 Culture Check
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
          aria-label="Close feedback"
        >
          ✕
        </button>
      </div>
      <div className="px-4 py-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-indigo-900 dark:text-indigo-200">
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
  const { state, refine, clearFeedback, abort } = useRefinement(editor, draftId);

  const { status, activeAction, feedback, error } = state;
  const isBusy = status === "loading";

  return (
    <div className="space-y-2">
      {/* ── Button row ── */}
      <div className="flex flex-wrap gap-1.5">
        {BUTTONS.map(({ action, label, icon, title }) => {
          const isActive   = isBusy && activeAction === action;
          const isDisabled = isBusy && activeAction !== action;

          return (
            <button
              key={action}
              type="button"
              title={title}
              disabled={isDisabled || !draftId}
              onClick={() => isActive ? abort() : refine(action)}
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                "ring-1 ring-inset transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-40",
                isActive
                  ? "bg-neutral-900 text-white ring-neutral-900 dark:bg-white dark:text-neutral-900 dark:ring-white"
                  : "bg-white text-neutral-600 ring-neutral-200 hover:bg-neutral-50 hover:text-neutral-900",
                "dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-700",
                "dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
              ].join(" ")}
            >
              {isActive ? <Spinner /> : <span aria-hidden="true">{icon}</span>}
              {label}
              {isActive && (
                <span className="ml-0.5 text-neutral-400 dark:text-neutral-500">
                  · stop
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Error toast ── */}
      {status === "error" && error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* ── Culture check feedback panel ── */}
      {feedback && (
        <FeedbackPanel text={feedback} onClose={clearFeedback} />
      )}
    </div>
  );
}
