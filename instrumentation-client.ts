import * as Sentry from "@sentry/nextjs";

// ---------------------------------------------------------------------------
// Sentry browser init — production only
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Sampling
    tracesSampleRate: 0.1, // 10% of transactions
    replaysSessionSampleRate: 0, // no session replays by default
    replaysOnErrorSampleRate: 0.1, // replay 10% of error sessions

    // Ignore noisy errors that aren't actionable
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "AbortError",
      "The user aborted a request",
      "CLIENT_DISCONNECTED",
      "Non-Error promise rejection captured",
    ],

    // Strip PII from request data before sending to Sentry
    beforeSend(event) {
      // Strip request body (may contain interview answers, CV text, etc.)
      if (event.request) {
        if (event.request.data) {
          event.request.data = "[stripped]";
        }
        // Strip query string (may contain session/draft IDs that correlate to PII)
        if (event.request.query_string) {
          event.request.query_string = "[stripped]";
        }
        // Strip cookies
        if (event.request.cookies) {
          event.request.cookies = { "[stripped]": "" };
        }
      }

      // Strip user email (keep only Clerk user ID for debugging)
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }

      // Strip PII from breadcrumbs (fetch bodies, form inputs)
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => {
          if (b.category === "fetch" || b.category === "xhr") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = b.data as Record<string, any> | undefined;
            if (data?.body) data.body = "[stripped]";
            if (data?.requestBody) data.requestBody = "[stripped]";
          }
          return b;
        });
      }

      return event;
    },
  });
}

// Required for Next.js 15+ navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
