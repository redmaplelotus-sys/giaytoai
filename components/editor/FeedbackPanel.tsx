"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import posthog from "posthog-js";
import type { FeedbackInsight } from "@/lib/claude/feedback";

// ---------------------------------------------------------------------------
// Types & config
// ---------------------------------------------------------------------------

type FilterType = "all" | "strength" | "improve" | "warning" | "culture" | "note";

interface FeedbackPanelProps {
  draftId: string;
  docTypeSlug: string;
  editor?: Editor | null;
}

const FILTER_LABELS: Record<FilterType, string> = {
  all:      "Tất cả",
  strength: "Điểm mạnh",
  improve:  "Cải thiện",
  warning:  "Lưu ý",
  culture:  "Văn hóa",
  note:     "Ghi chú",
};

const TYPE_COLORS = {
  strength: { bg: "#F6FBF0", border: "#C0DD97", iconBg: "#EAF3DE", text: "#3B6D11", dot: "#3B6D11", activeBg: "#EAF3DE", activeColor: "#27500A", activeBorder: "#C0DD97", quote: "#3B6D11", action: "#3B6D11" },
  improve:  { bg: "#F0F6FD", border: "#B5D4F4", iconBg: "#E6F1FB", text: "#185FA5", dot: "#185FA5", activeBg: "#E6F1FB", activeColor: "#0C447C", activeBorder: "#B5D4F4", quote: "#185FA5", action: "#185FA5" },
  warning:  { bg: "#FEF8EE", border: "#FAC775", iconBg: "#FAEEDA", text: "#854F0B", dot: "#854F0B", activeBg: "#FAEEDA", activeColor: "#633806", activeBorder: "#FAC775", quote: "#854F0B", action: "#854F0B" },
  culture:  { bg: "#F5F4FF", border: "#AFA9EC", iconBg: "#EEEDFE", text: "#534AB7", dot: "#534AB7", activeBg: "#EEEDFE", activeColor: "#3C3489", activeBorder: "#AFA9EC", quote: "#534AB7", action: "#534AB7" },
  note:     { bg: "#F7F7F5", border: "#D4D4CE", iconBg: "#EDEDEA", text: "#5F5E5A", dot: "#5F5E5A", activeBg: "#EDEDEA", activeColor: "#3D3D3A", activeBorder: "#D4D4CE", quote: "#5F5E5A", action: "#5F5E5A" },
};

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7L5.5 10L11.5 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowUpIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 11V3M3.5 6.5L7 3L10.5 6.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarningIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5L12.5 11.5H1.5L7 1.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 5.5V8M7 9.5V10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GlobeIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.5" />
      <path d="M7 1.5C7 1.5 5 4 5 7s2 5.5 2 5.5M7 1.5C7 1.5 9 4 9 7s-2 5.5-2 5.5" stroke={color} strokeWidth="1.2" />
      <path d="M1.5 7h11" stroke={color} strokeWidth="1.2" />
      <path d="M2 4.5h10M2 9.5h10" stroke={color} strokeWidth="1" />
    </svg>
  );
}

function NoteIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3.5 2h7a1 1 0 011 1v8a1 1 0 01-1 1h-7a1 1 0 01-1-1V3a1 1 0 011-1z" stroke={color} strokeWidth="1.5" />
      <path d="M5 5.5h4M5 8h2.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.5" />
      <path d="M8 7v4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="5" r="0.75" fill={color} />
    </svg>
  );
}

function TypeIcon({ type }: { type: FeedbackInsight["type"] }) {
  const c = TYPE_COLORS[type];
  return (
    <div style={{ width: 28, height: 28, borderRadius: 7, background: c.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {type === "strength" && <CheckIcon color={c.text} />}
      {type === "improve"  && <ArrowUpIcon color={c.text} />}
      {type === "warning"  && <WarningIcon color={c.text} />}
      {type === "culture"  && <GlobeIcon color={c.text} />}
      {type === "note"     && <NoteIcon color={c.text} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

function calcScore(insights: FeedbackInsight[]): number {
  let score = 5;
  let strengthCount = 0;
  for (const ins of insights) {
    if (ins.type === "strength" && strengthCount < 2) { score += 1; strengthCount++; }
    if (ins.type === "warning") score -= 0.5;
  }
  return Math.min(9, Math.max(1, Math.round(score)));
}

// ---------------------------------------------------------------------------
// Skeleton loading state
// ---------------------------------------------------------------------------

function SkeletonCard({ widths }: { widths: [number, number] }) {
  return (
    <div className="feedback-skeleton-card" style={{ padding: "14px 16px", borderRadius: 10, background: "#F8F8F7", border: "1px solid #EEEDE8", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div className="feedback-pulse" style={{ width: 28, height: 28, borderRadius: 7, background: "#E8E8E4" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="feedback-pulse" style={{ height: 8, borderRadius: 4, background: "#E8E8E4", width: `${widths[0]}%` }} />
          <div className="feedback-pulse" style={{ height: 8, borderRadius: 4, background: "#E8E8E4", width: `${widths[1]}%` }} />
        </div>
      </div>
      <div className="feedback-pulse" style={{ height: 8, borderRadius: 4, background: "#E8E8E4", width: "90%" }} />
      <div className="feedback-pulse" style={{ height: 8, borderRadius: 4, background: "#E8E8E4", width: "75%" }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FeedbackPanel({ draftId, docTypeSlug, editor }: FeedbackPanelProps) {
  const [insights, setInsights]       = useState<FeedbackInsight[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [loading, setLoading]         = useState(true);
  const [visible, setVisible]         = useState(false);
  const [applyingId, setApplyingId]   = useState<string | null>(null);
  const hasFiredView = useRef(false);

  // Fade-in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Fetch feedback
  useEffect(() => {
    fetch(`/api/drafts/${draftId}/feedback`)
      .then((r) => r.json())
      .then((data: { insights?: FeedbackInsight[] }) => {
        const items = data.insights ?? [];
        setInsights(items);
        if (!hasFiredView.current) {
          hasFiredView.current = true;
          posthog.capture("feedback_panel_viewed", { docTypeSlug, insightCount: items.length });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [draftId, docTypeSlug]);

  const handleFilterClick = useCallback((f: FilterType) => {
    setActiveFilter(f);
    if (f !== "all") {
      posthog.capture("feedback_filter_used", { filter: f });
    }
  }, []);

  const handleApply = useCallback(async (insight: FeedbackInsight) => {
    if (!editor || applyingId) return;
    setApplyingId(insight.id);

    const currentText = editor.getText();

    try {
      const response = await fetch(`/api/drafts/${draftId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "applyInsight",
          currentText,
          instruction: insight.body,
        }),
      });

      if (!response.ok || !response.body) return;

      editor.commands.clearContent(false);

      const reader = response.body.getReader();
      const dec = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });
        const messages = buffer.split("\n\n");
        buffer = messages.pop() ?? "";

        for (const msg of messages) {
          let eventName = "";
          let dataLine = "";
          for (const line of msg.split("\n")) {
            if (line.startsWith("event:")) eventName = line.slice(6).trim();
            if (line.startsWith("data:"))  dataLine  = line.slice(5).trim();
          }
          if (eventName === "delta" && dataLine) {
            try {
              const { text } = JSON.parse(dataLine) as { text: string };
              editor.commands.focus("end");
              editor.commands.insertContent(text, { parseOptions: { preserveWhitespace: "full" } });
            } catch { /* ignore */ }
          }
        }
      }

      posthog.capture("feedback_action_applied", { insightType: insight.type, docTypeSlug });
    } catch { /* non-fatal */ } finally {
      setApplyingId(null);
    }
  }, [editor, draftId, applyingId, docTypeSlug]);

  const filtered = activeFilter === "all"
    ? insights
    : insights.filter((i) => i.type === activeFilter);

  const score       = calcScore(insights);
  const improveCount = insights.filter((i) => i.type === "improve").length;
  const targetScore  = Math.min(10, Math.round(score + improveCount * 0.7));

  // ── Filter button style helpers ─────────────────────────────────────────
  const filterBtnStyle = (f: FilterType): React.CSSProperties => {
    const isActive = activeFilter === f;
    if (f === "all") {
      return {
        padding: "5px 14px",
        borderRadius: 16,
        fontSize: 12,
        border: isActive ? "none" : "1px solid #E8E8E4",
        background: isActive ? "#1B3A5C" : "#fff",
        color: isActive ? "#fff" : "#5F5E5A",
        cursor: "pointer",
        fontWeight: isActive ? 500 : 400,
      };
    }
    const c = TYPE_COLORS[f as keyof typeof TYPE_COLORS];
    return {
      padding: "5px 14px",
      borderRadius: 16,
      fontSize: 12,
      border: `1px solid ${isActive ? c.activeBorder : "#E8E8E4"}`,
      background: isActive ? c.activeBg : "#fff",
      color: isActive ? c.activeColor : "#5F5E5A",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 5,
      fontWeight: isActive ? 500 : 400,
    };
  };

  const filteredCount = activeFilter === "all" ? insights.length : filtered.length;

  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes feedbackPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .feedback-pulse { animation: feedbackPulse 1.5s ease-in-out infinite; }
      `}</style>

      <div
        style={{
          background: "#fff",
          border: "1px solid #E8E8E4",
          borderRadius: 12,
          overflow: "hidden",
          marginTop: 16,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #F1EFE8",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {/* Left: icon + title + count */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <InfoIcon color="#185FA5" />
            <span style={{ fontSize: 14, fontWeight: 500, color: "#1B3A5C" }}>
              Phân tích tài liệu
            </span>
            {!loading && (
              <span style={{ background: "#F1EFE8", borderRadius: 10, padding: "2px 8px", fontSize: 11, color: "#5F5E5A" }}>
                {filteredCount} nhận xét
              </span>
            )}
          </div>

          {/* Right: filter buttons */}
          {!loading && insights.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(["all", "strength", "improve", "warning", "culture", "note"] as FilterType[]).map((f) => {
                const count = f === "all" ? insights.length : insights.filter((i) => i.type === f).length;
                if (count === 0 && f !== "all") return null;
                const c = f !== "all" ? TYPE_COLORS[f as keyof typeof TYPE_COLORS] : null;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => handleFilterClick(f)}
                    style={filterBtnStyle(f)}
                  >
                    {c && (
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: activeFilter === f ? c.activeColor : c.dot, flexShrink: 0 }} />
                    )}
                    {FILTER_LABELS[f]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? (
            <>
              <SkeletonCard widths={[45, 70]} />
              <SkeletonCard widths={[55, 60]} />
              <SkeletonCard widths={[40, 80]} />
            </>
          ) : filtered.length === 0 ? (
            <p style={{ fontSize: 13, color: "#5F5E5A", textAlign: "center", padding: "12px 0" }}>
              Không có nhận xét nào.
            </p>
          ) : (
            filtered.map((insight) => {
              const c = TYPE_COLORS[insight.type];
              const isApplying = applyingId === insight.id;
              return (
                <div
                  key={insight.id}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 10,
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {/* Card header */}
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <TypeIcon type={insight.type} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: c.text, marginBottom: 2 }}>
                        {FILTER_LABELS[insight.type]}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#1B3A5C", lineHeight: 1.4 }}>
                        {insight.title}
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <p style={{ fontSize: 13, color: "#444441", lineHeight: 1.6, margin: 0 }}>
                    {insight.body}
                  </p>

                  {/* Quote block */}
                  {insight.quote && (
                    <div
                      style={{
                        background: "rgba(255,255,255,0.7)",
                        borderRadius: 6,
                        padding: "8px 12px",
                        fontSize: 12,
                        color: "#5F5E5A",
                        fontStyle: "italic",
                        borderLeft: `3px solid ${c.quote}`,
                      }}
                    >
                      "{insight.quote}"
                    </div>
                  )}

                  {/* Action button */}
                  {insight.actionable && editor && (
                    <button
                      type="button"
                      onClick={() => handleApply(insight)}
                      disabled={!!applyingId}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        fontSize: 12,
                        fontWeight: 500,
                        color: isApplying ? "#999" : c.action,
                        cursor: applyingId ? "not-allowed" : "pointer",
                        textAlign: "left",
                        alignSelf: "flex-start",
                      }}
                    >
                      {isApplying ? "Đang áp dụng…" : "Áp dụng gợi ý này →"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && insights.length > 0 && (
          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid #F1EFE8",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {/* Left: score bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#5F5E5A", whiteSpace: "nowrap" }}>
                Chất lượng tổng thể
              </span>
              <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 12,
                      height: 14,
                      borderRadius: 3,
                      background: i < score ? "#1B3A5C" : "#E8E8E4",
                      transition: "background 0.3s",
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1B3A5C" }}>
                {score}/10
              </span>
            </div>

            {/* Right: improvement hint */}
            {improveCount > 0 && targetScore > score && (
              <span style={{ fontSize: 12, color: "#5F5E5A" }}>
                Áp dụng{" "}
                <strong style={{ color: "#185FA5" }}>{improveCount} gợi ý</strong>{" "}
                cải thiện để đạt{" "}
                <strong style={{ color: "#1B3A5C" }}>{targetScore}/10</strong>
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
