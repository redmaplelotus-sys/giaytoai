/**
 * Domain events fired after significant user actions.
 *
 * Each function captures a PostHog server-side event and is the single place
 * to add Trigger.dev background jobs, webhooks, or other side-effects once
 * those integrations are wired up.
 *
 * All functions are fire-and-forget: they swallow errors so callers are never
 * blocked or failed by analytics/side-effect failures.
 */

import { PostHog } from "posthog-node";
import { clientEnv } from "@/lib/env";
import { scheduleOutcomeEmail } from "@/trigger/schedule-outcome-email";

// ---------------------------------------------------------------------------
// PostHog server client (singleton, lazy)
// ---------------------------------------------------------------------------

let _ph: PostHog | null = null;

function ph(): PostHog | null {
  if (!clientEnv.posthogKey) return null;
  if (!_ph) {
    _ph = new PostHog(clientEnv.posthogKey, {
      host:          clientEnv.posthogHost ?? "https://app.posthog.com",
      flushAt:       1,
      flushInterval: 0,
    });
  }
  return _ph;
}

// ---------------------------------------------------------------------------
// onDraftExported
//
// Fired after a draft has been built, uploaded to R2, and the export record
// saved. Safe to await — resolves after PostHog flush; never throws.
//
// Extend this function to trigger background jobs (Trigger.dev), send
// webhook notifications, or update usage quotas.
// ---------------------------------------------------------------------------

export interface DraftExportedPayload {
  userId:    string;
  draftId:   string;
  sessionId: string;
  format:    "docx" | "html" | "bilingual";
  fileSizeBytes: number;
  r2Key:     string | undefined;
}

export interface DraftDownloadedPayload {
  userId:    string;
  draftId:   string;
  sessionId: string;
  format:    "docx" | "html" | "bilingual" | "pdf";
}

export async function onDraftDownloaded(payload: DraftDownloadedPayload): Promise<void> {
  try {
    ph()?.capture({
      distinctId: payload.userId,
      event:      "draft_downloaded",
      properties: {
        draft_id:   payload.draftId,
        session_id: payload.sessionId,
        format:     payload.format,
      },
    });

    await ph()?.shutdown();
  } catch {
    // Analytics failure must never propagate to the user
  }
}

export async function onDraftExported(payload: DraftExportedPayload): Promise<void> {
  try {
    ph()?.capture({
      distinctId: payload.userId,
      event:      "draft_exported",
      properties: {
        draft_id:        payload.draftId,
        session_id:      payload.sessionId,
        format:          payload.format,
        file_size_bytes: payload.fileSizeBytes,
        stored_in_r2:    !!payload.r2Key,
      },
    });

    await ph()?.shutdown();
  } catch {
    // Analytics failure must never propagate to the user
  }

  // Schedule outcome feedback email 56 days from now
  try {
    await scheduleOutcomeEmail.trigger({
      userId:    payload.userId,
      sessionId: payload.sessionId,
      format:    payload.format,
    });
  } catch {
    // Background job failure must never block the export
  }
}
