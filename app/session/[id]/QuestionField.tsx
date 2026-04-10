"use client";

import type { AnswerSource } from "@/lib/session/answers";

/** @deprecated Use AnswerSource from @/lib/session/answers */
export type FieldSource = AnswerSource;

const BADGE_META: Record<AnswerSource, { label: string; icon: string; cls: string }> = {
  missing: {
    icon: "○",
    label: "Required",
    cls: "source-missing",
  },
  extracted: {
    icon: "◈",
    label: "Extracted",
    cls: "source-extracted",
  },
  user: {
    icon: "✓",
    label: "Saved",
    cls: "source-user",
  },
};

function SourceBadge({ source }: { source: AnswerSource }) {
  const { icon, label, cls } = BADGE_META[source];
  return (
    <span aria-label={label} title={label} className={`source-badge ${cls}`}>
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Input modifier class by source
// ---------------------------------------------------------------------------

const INPUT_SOURCE_CLASS: Record<AnswerSource, string> = {
  missing:   "input-field-missing",
  extracted: "input-field-extracted",
  user:      "input-field-user",
};

// ---------------------------------------------------------------------------
// Char count display
// ---------------------------------------------------------------------------

function charCountColor(n: number): string {
  if (n === 0) return "var(--color-text-hint)";
  if (n < 50)  return "var(--color-amber)";
  return "var(--color-text-muted)";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface QuestionFieldProps {
  id: string;
  label: string;
  hint?: string;
  value: string;
  source: AnswerSource;
  type?: "text" | "textarea" | "number";
  rows?: number;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function QuestionField({
  id,
  label,
  hint,
  value,
  source,
  type = "textarea",
  rows = 3,
  onChange,
  onBlur,
}: QuestionFieldProps) {
  const inputClass = `input-field ${INPUT_SOURCE_CLASS[source]}`;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => onChange(e.target.value);

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium leading-none" style={{ color: "var(--color-text-primary)" }}>
          {label}
        </label>
        <SourceBadge source={source} />
      </div>

      {/* Hint */}
      {hint && (
        <p className="text-xs leading-snug" style={{ color: "var(--color-text-muted)" }}>{hint}</p>
      )}

      {/* Input */}
      {type === "textarea" ? (
        <>
          <textarea
            id={id}
            value={value}
            rows={rows}
            onChange={handleChange}
            onBlur={onBlur}
            className={`${inputClass} resize-y`}
          />
          <p
            className="text-right text-xs tabular-nums"
            style={{ color: charCountColor(value.length) }}
          >
            {value.length.toLocaleString()} chars
          </p>
        </>
      ) : type === "number" ? (
        <input
          id={id}
          type="number"
          min={0}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          className={inputClass}
          style={{ width: 144 }}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          className={inputClass}
        />
      )}
    </div>
  );
}
