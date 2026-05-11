// Sentry server-side init — production only, PII stripped, release tracked.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Release tracking via Vercel build metadata
    environment: process.env.VERCEL_ENV ?? "unknown",
    release: process.env.VERCEL_GIT_COMMIT_SHA,

    // Sampling — 10% of traces to stay well under free tier
    tracesSampleRate: 0.1,

    // Privacy: do NOT send PII by default. Strip in beforeSend below.
    sendDefaultPii: false,

    // Ignore client-caused errors that aren't actionable server-side
    ignoreErrors: [
      "AbortError",
      "CLIENT_DISCONNECTED",
      "ECONNRESET",
      "EPIPE",
    ],

    // Strip PII from request data before sending to Sentry
    beforeSend(event) {
      if (event.request) {
        if (event.request.data) {
          event.request.data = "[stripped]";
        }
        if (event.request.cookies) {
          event.request.cookies = { "[stripped]": "" };
        }
        // Strip auth headers
        if (event.request.headers) {
          const h = event.request.headers as Record<string, string>;
          if (h.authorization)         h.authorization         = "[stripped]";
          if (h.cookie)                h.cookie                = "[stripped]";
          if (h["x-clerk-auth-token"]) h["x-clerk-auth-token"] = "[stripped]";
        }
      }

      // Keep Clerk user ID for debugging; strip email/username/IP
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }

      return event;
    },

    // Default tags on every event
    initialScope: {
      tags: {
        vercel_env:    process.env.VERCEL_ENV ?? "unknown",
        vercel_region: process.env.VERCEL_REGION ?? "unknown",
      },
    },
  });
}
