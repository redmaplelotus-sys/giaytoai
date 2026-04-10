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
    <span className={`badge badge-${color}`} title={title}>
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
      className="badge badge-neutral animate-pulse"
      style={{ width: 80 }}
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
        <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--color-amber)" }}>
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
        <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--color-green)" }}>
          <span className="mt-px shrink-0" aria-hidden="true">✓</span>
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

interface QualityBadgeRowProps {
  quality: QualityReport;
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
        <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>
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
      <div
        className="p-4"
        style={{
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-default)",
          background: "var(--color-bg-subtle)",
        }}
      >
        <QualityBadgeRow quality={qs.quality} showDetail={showDetail} />
      </div>
    );
  }

  if (qs.status === "polling") {
    return (
      <div
        className="p-4"
        style={{
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-default)",
          background: "var(--color-bg-subtle)",
        }}
      >
        <div className="flex flex-wrap gap-2">
          <SkeletonPill />
          <SkeletonPill />
          <SkeletonPill />
        </div>
      </div>
    );
  }

  return null;
}
