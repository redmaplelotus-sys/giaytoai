import * as Sentry from "@sentry/nextjs";

// ---------------------------------------------------------------------------
// Sentry edge runtime init — for middleware and edge routes
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? "unknown",
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0.1,
    initialScope: {
      tags: {
        vercel_env: process.env.VERCEL_ENV ?? "unknown",
        runtime: "edge",
      },
    },
  });
}
