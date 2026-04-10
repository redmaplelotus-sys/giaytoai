"use client";

import type { QualityReport } from "@/lib/ai/quality";
import { useDraftQuality } from "@/hooks/useDraftQuality";

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

type Palette = "green" | "amber" | "red" | "neutral";

function scoreColor(score: 1 | 2 | 3 | 4 | 5): Palette {
  if (score >= 4) return "green";
  if (score >= 3) return "amber";
  return "red";
}

function wordCountColor(status: QualityReport["wordCountStatus"]["status"]): Palette {
  if (status === "ok")      return "green";
  if (status === "unknown") return "neutral";
  return "amber"; // over | under
}

const PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset";

const PILL_PALETTE: Record<Palette, string> = {
  green:   "bg-green-50 text-green-700 ring-green-200 dark:bg-green-900/20 dark:text-green-300 dark:ring-green-700",
  amber:   "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700",
  red:     "bg-red-50   text-red-700   ring-red-200   dark:bg-red-900/20   dark:text-red-300   dark:ring-red-700",
  neutral: "bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700",
};

function Pill({
  color,
  icon,
  label,
  title,
}: {
  color: Palette;
  icon: string;
  label: string;
  title?: string;
}) {
  return (
    <span
      className={`${PILL_BASE} ${PILL_PALETTE[color]}`}
      title={title}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Skeleton pill — shown while polling
// ---------------------------------------------------------------------------
function SkeletonPill() {
  return (
    <span
      className={`${PILL_BASE} ${PILL_PALETTE.neutral} animate-pulse w-24`}
      aria-hidden="true"
    >
      &nbsp;
    </span>
  );
}

// ---------------------------------------------------------------------------
// Individual badge components — usable standalone
// ---------------------------------------------------------------------------

export function LengthBadge({ quality }: { quality: QualityReport }) {
  const { actual, target, status, delta } = quality.wordCountStatus;
  const color = wordCountColor(status);

  let label: string;
  let icon:  string;
  if (status === "ok") {
    label = target ? `${actual} / ${target} words` : `${actual} words`;
    icon  = "✓";
  } else if (status === "over") {
    label = `${actual} words (+${delta} over)`;
    icon  = "↑";
  } else if (status === "under") {
    label = `${actual} words (${Math.abs(delta!)} short)`;
    icon  = "↓";
  } else {
    label = `${actual} words`;
    icon  = "≈";
  }

  return <Pill color={color} icon={icon} label={label} title="Word count" />;
}

export function ToneBadge({ quality }: { quality: QualityReport }) {
  const color = scoreColor(quality.toneScore);
  return (
    <Pill
      color={color}
      icon="♜"
      label={`Tone ${quality.toneScore}/5`}
      title={quality.toneNote}
    />
  );
}

export function FitBadge({ quality }: { quality: QualityReport }) {
  const color = scoreColor(quality.specificityScore);
  return (
    <Pill
      color={color}
      icon="◎"
      label={`Fit ${quality.specificityScore}/5`}
      title="How specifically the draft uses the applicant's details"
    />
  );
}

// ---------------------------------------------------------------------------
// QualityBadgeRow — three badges in a row with optional detail expand
// ---------------------------------------------------------------------------

function WarningList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {items.map((w, i) => (
        <li key={i} className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <span className="mt-px shrink-0" aria-hidden="true">⚠</span>
          <span>{w}</span>
        </li>
      ))}
    </ul>
  );
}

function StrengthList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {items.map((s, i) => (
        <li key={i} className="flex items-start gap-1.5 text-xs text-green-600 dark:text-green-400">
          <span className="mt-px shrink-0" aria-hidden="true">✓</span>
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

interface QualityBadgeRowProps {
  quality: QualityReport;
  /** When true, renders warnings and strengths below the pills */
  showDetail?: boolean;
}

export function QualityBadgeRow({ quality, showDetail = false }: QualityBadgeRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <LengthBadge quality={quality} />
        <ToneBadge   quality={quality} />
        <FitBadge    quality={quality} />
      </div>
      {quality.toneNote && (
        <p className="text-xs italic text-neutral-500 dark:text-neutral-400">
          {quality.toneNote}
        </p>
      )}
      {showDetail && (
        <>
          <WarningList  items={quality.warnings}  />
          <StrengthList items={quality.strengths} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PollingQualityBadges
//
// Drop-in component: pass a draftId and optionally seed with quality from
// the SSE stream. Shows skeleton pills while polling, then the real badges.
//
// Usage:
//   <PollingQualityBadges draftId={draftId} initialQuality={streamQuality} />
// ---------------------------------------------------------------------------

interface PollingQualityBadgesProps {
  draftId: string | null | undefined;
  initialQuality?: QualityReport | null;
  showDetail?: boolean;
}

export function PollingQualityBadges({
  draftId,
  initialQuality,
  showDetail = false,
}: PollingQualityBadgesProps) {
  const qs = useDraftQuality(draftId, { initialQuality });

  if (qs.status === "idle") return null;

  if (qs.status === "ready") {
    return (
      <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
        <QualityBadgeRow quality={qs.quality} showDetail={showDetail} />
      </div>
    );
  }

  if (qs.status === "polling") {
    return (
      <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
        <div className="flex flex-wrap gap-2">
          <SkeletonPill />
          <SkeletonPill />
          <SkeletonPill />
        </div>
      </div>
    );
  }

  // timeout or error — silently collapse (quality is non-critical)
  return null;
}
