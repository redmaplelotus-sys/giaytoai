// Next.js 15+ server instrumentation hook.
// Conditionally loads Sentry server/edge config based on runtime.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Re-export Sentry's server-side request error capture
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const onRequestError = require("@sentry/nextjs").captureRequestError;
