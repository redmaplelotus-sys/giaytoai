import * as Sentry from "@sentry/nextjs";

// ---------------------------------------------------------------------------
// Sentry helper functions
// ---------------------------------------------------------------------------

/**
 * Runs a function with Sentry scope populated with tags and user context.
 * Use for correlating errors/warnings to a specific user or flow.
 *
 * Example:
 *   const result = await withSentryContext(
 *     { userId, tags: { route: "generate", slug: "cover-letter" } },
 *     async () => {
 *       return streamDraft(compiled);
 *     },
 *   );
 */
export async function withSentryContext<T>(
  context: {
    userId?: string;
    tags?: Record<string, string>;
    extras?: Record<string, unknown>;
  },
  fn: () => Promise<T>,
): Promise<T> {
  return Sentry.withScope(async (scope) => {
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    if (context.tags) {
      for (const [k, v] of Object.entries(context.tags)) {
        scope.setTag(k, v);
      }
    }
    if (context.extras) {
      for (const [k, v] of Object.entries(context.extras)) {
        scope.setExtra(k, v);
      }
    }
    return fn();
  });
}

/**
 * Captures a warning-level message (non-fatal but worth surfacing).
 * Use for edge cases that shouldn't crash the app but need visibility.
 *
 * Example:
 *   captureWarning("Quality check returned low score", {
 *     draftId, score, userId,
 *   });
 */
export function captureWarning(
  message: string,
  extras?: Record<string, unknown>,
): void {
  Sentry.withScope((scope) => {
    scope.setLevel("warning");
    if (extras) {
      for (const [k, v] of Object.entries(extras)) {
        scope.setExtra(k, v);
      }
    }
    Sentry.captureMessage(message);
  });
}

/**
 * Captures a refund event with structured context.
 * Fires when a credit is refunded (failed generation, export error, etc.)
 * or when a payment is refunded via Stripe/PayOS webhook.
 *
 * Example:
 *   captureRefundEvent({
 *     userId, amount: 1, reason: "generation_failed",
 *     draftId, sessionId,
 *   });
 */
export interface RefundEventPayload {
  userId: string;
  amount: number;
  /** Reason code: "generation_failed" | "export_failed" | "payment_refund" | other */
  reason: string;
  /** Currency for payment refunds; omit for credit refunds */
  currency?: "USD" | "VND";
  draftId?: string;
  sessionId?: string;
  /** Stripe charge ID, PayOS order code, or internal ref */
  refundRef?: string;
}

export function captureRefundEvent(payload: RefundEventPayload): void {
  Sentry.withScope((scope) => {
    scope.setLevel("info");
    scope.setUser({ id: payload.userId });
    scope.setTag("event_type", "refund");
    scope.setTag("refund_reason", payload.reason);
    if (payload.currency) scope.setTag("currency", payload.currency);
    if (payload.draftId) scope.setExtra("draft_id", payload.draftId);
    if (payload.sessionId) scope.setExtra("session_id", payload.sessionId);
    if (payload.refundRef) scope.setExtra("refund_ref", payload.refundRef);
    scope.setExtra("amount", payload.amount);

    Sentry.captureMessage(`Refund: ${payload.reason} (${payload.amount})`);
  });
}
