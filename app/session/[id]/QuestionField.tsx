"use client";

// ---------------------------------------------------------------------------
// Source badge
// ---------------------------------------------------------------------------

export type FieldSource = "extracted" | "confirm" | "missing";

const BADGE: Record<
  FieldSource,
  { label: string; icon: string; className: string }
> = {
  missing: {
    icon: "○",
    label: "Required",
    className: "text-neutral-400 dark:text-neutral-500",
  },
  extracted: {
    icon: "◈",
    label: "Review",
    className:
      "rounded-full bg-amber-50 px-1.5 py-0.5 text-amber-600 ring-1 ring-amber-200 " +
      "dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800",
  },
  confirm: {
    icon: "✓",
    label: "Saved",
    className:
      "rounded-full bg-green-50 px-1.5 py-0.5 text-green-700 ring-1 ring-green-200 " +
      "dark:bg-green-900/20 dark:text-green-400 dark:ring-green-800",
  },
};

function SourceBadge({ source }: { source: FieldSource }) {
  const { icon, label, className } = BADGE[source];
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center gap-0.5 text-xs font-medium leading-none select-none ${className}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Border and ring by source
// ---------------------------------------------------------------------------

const BORDER: Record<FieldSource, string> = {
  missing:   "border-red-200   dark:border-red-900",
  extracted: "border-amber-300 dark:border-amber-700",
  confirm:   "border-green-300 dark:border-green-700",
};

const FOCUS_RING: Record<FieldSource, string> = {
  missing:   "focus:border-red-400   focus:ring-red-400   dark:focus:border-red-600   dark:focus:ring-red-600",
  extracted: "focus:border-amber-500 focus:ring-amber-500 dark:focus:border-amber-500 dark:focus:ring-amber-500",
  confirm:   "focus:border-green-500 focus:ring-green-500 dark:focus:border-green-500 dark:focus:ring-green-500",
};

// ---------------------------------------------------------------------------
// Char count display
// ---------------------------------------------------------------------------

const COUNT_COLOR = (n: number): string => {
  if (n === 0) return "text-neutral-300 dark:text-neutral-600";
  if (n < 50)  return "text-amber-500";
  return "text-neutral-400 dark:text-neutral-500";
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface QuestionFieldProps {
  id: string;
  label: string;
  hint?: string;
  value: string;
  source: FieldSource;
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
  const border = BORDER[source];
  const focusRing = FOCUS_RING[source];

  const baseClass =
    "w-full rounded-lg border bg-white px-3 py-2 text-sm " +
    "placeholder-neutral-300 transition-colors " +
    "focus:outline-none focus:ring-1 " +
    "dark:bg-neutral-900 dark:placeholder-neutral-600 " +
    `${border} ${focusRing}`;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => onChange(e.target.value);

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium leading-none">
          {label}
        </label>
        <SourceBadge source={source} />
      </div>

      {/* Hint */}
      {hint && (
        <p className="text-xs leading-snug text-neutral-400">{hint}</p>
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
            className={`${baseClass} resize-y`}
          />
          <p className={`text-right text-xs tabular-nums ${COUNT_COLOR(value.length)}`}>
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
          className={baseClass.replace("w-full", "w-36")}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          className={baseClass}
        />
      )}
    </div>
  );
}
