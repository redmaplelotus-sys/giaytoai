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
    className:
      "text-neutral-400 dark:text-neutral-600",
  },
  extracted: {
    icon: "◈",
    label: "Review",
    className:
      "rounded-full bg-amber-50 px-1.5 py-0.5 text-amber-600 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800",
  },
  confirm: {
    icon: "✓",
    label: "Saved",
    className:
      "rounded-full bg-green-50 px-1.5 py-0.5 text-green-600 ring-1 ring-green-200 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-800",
  },
};

function SourceBadge({ source }: { source: FieldSource }) {
  const { icon, label, className } = BADGE[source];
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-0.5 text-xs font-medium leading-none select-none ${className}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Input variants
// ---------------------------------------------------------------------------

const BASE_INPUT =
  "w-full rounded-lg border bg-white px-3 py-2 text-sm " +
  "placeholder-neutral-300 " +
  "transition-colors focus:outline-none focus:ring-1 " +
  "focus:border-neutral-900 focus:ring-neutral-900 " +
  "dark:bg-neutral-900 dark:placeholder-neutral-600 " +
  "dark:focus:border-white dark:focus:ring-white";

const BORDER_BY_SOURCE: Record<FieldSource, string> = {
  missing:
    "border-neutral-200 dark:border-neutral-700",
  extracted:
    "border-amber-300 dark:border-amber-700",
  confirm:
    "border-neutral-200 dark:border-neutral-700",
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
  const borderCls = BORDER_BY_SOURCE[source];

  const sharedProps = {
    id,
    value,
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(e.target.value),
    onBlur,
    className: `${BASE_INPUT} ${borderCls}`,
  };

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
        <textarea {...sharedProps} rows={rows} className={`${sharedProps.className} resize-y`} />
      ) : type === "number" ? (
        <input
          {...sharedProps}
          type="number"
          min={0}
          className={`w-36 rounded-lg border bg-white px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-1 focus:border-neutral-900 focus:ring-neutral-900 dark:bg-neutral-900 dark:focus:border-white dark:focus:ring-white ${borderCls}`}
        />
      ) : (
        <input {...sharedProps} type="text" />
      )}
    </div>
  );
}
