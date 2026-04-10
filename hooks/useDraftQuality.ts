"use client";

import { useEffect, useRef, useState } from "react";
import type { QualityReport } from "@/lib/ai/quality";

const POLL_INTERVAL_MS = 5_000;
const MAX_ATTEMPTS     = 24; // 2 minutes total; give up after that

export type QualityPollState =
  | { status: "idle" }
  | { status: "polling"; attempt: number }
  | { status: "ready";   quality: QualityReport }
  | { status: "timeout" }
  | { status: "error";   message: string };

/**
 * useDraftQuality(draftId)
 *
 * Polls GET /api/drafts/{draftId}/quality every 5 s until the quality report
 * is populated (populated === true) or the attempt limit is reached.
 *
 * Pass `null` or `undefined` to pause polling (e.g. while streaming).
 *
 * Usage:
 *   const qs = useDraftQuality(draftId);
 *   if (qs.status === "ready") renderBadges(qs.quality);
 *
 * If the generate SSE stream already returned quality data, seed the hook
 * with the `initialQuality` option so it skips polling entirely:
 *   const qs = useDraftQuality(draftId, { initialQuality: streamQuality });
 */
export function useDraftQuality(
  draftId: string | null | undefined,
  options?: { initialQuality?: QualityReport | null },
): QualityPollState {
  const [state, setState] = useState<QualityPollState>(() => {
    if (options?.initialQuality) {
      return { status: "ready", quality: options.initialQuality };
    }
    return draftId ? { status: "polling", attempt: 0 } : { status: "idle" };
  });

  // Keep initial quality stable across renders without adding it to deps
  const initialQualityRef = useRef(options?.initialQuality);

  const attemptsRef  = useRef(0);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    // If we already have quality from the SSE stream, nothing to do
    if (initialQualityRef.current) return;
    if (!draftId) {
      setState({ status: "idle" });
      return;
    }

    cancelledRef.current = false;
    attemptsRef.current  = 0;
    setState({ status: "polling", attempt: 0 });

    async function poll() {
      if (cancelledRef.current) return;

      attemptsRef.current += 1;
      const attempt = attemptsRef.current;

      if (attempt > MAX_ATTEMPTS) {
        setState({ status: "timeout" });
        return;
      }

      setState({ status: "polling", attempt });

      try {
        const res = await fetch(`/api/drafts/${draftId}/quality`, {
          cache: "no-store",
        });

        if (cancelledRef.current) return;

        if (!res.ok) {
          setState({ status: "error", message: `HTTP ${res.status}` });
          return;
        }

        const body = (await res.json()) as {
          quality_scores: QualityReport | null;
        };

        if (cancelledRef.current) return;

        if (body.quality_scores) {
          setState({ status: "ready", quality: body.quality_scores });
          return; // done — no more polling
        }

        // Not ready yet — schedule next poll
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelledRef.current) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // First poll immediately, subsequent ones after the interval
    poll();

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // Intentionally only re-run when draftId changes; initial quality handled by ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  return state;
}
