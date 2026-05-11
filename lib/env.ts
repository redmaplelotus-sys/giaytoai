/**
 * Client-safe environment variables — safe to import anywhere.
 * For server-only secrets import from "@/lib/server-env" instead.
 *
 * IMPORTANT: Each value must use a static `process.env.NEXT_PUBLIC_*` literal.
 * Next.js only inlines NEXT_PUBLIC_ vars when accessed via literal property
 * access — dynamic access like process.env[name] is never replaced in the
 * client bundle and always returns undefined.
 *
 * Required values are exposed via getters so the throw is deferred until
 * access. This lets non-browser runtimes (Trigger.dev task indexing, scripts,
 * tests) import this module without crashing when client vars aren't set.
 */

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const clientEnv = {
  // Clerk — required (deferred validation)
  get clerkPublishableKey()  { return required(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"); },
  get clerkSignInUrl()       { return required(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,       "NEXT_PUBLIC_CLERK_SIGN_IN_URL"); },
  get clerkSignUpUrl()       { return required(process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,       "NEXT_PUBLIC_CLERK_SIGN_UP_URL"); },
  get clerkAfterSignInUrl()  { return required(process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL, "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL"); },
  get clerkAfterSignUpUrl()  { return required(process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL, "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL"); },

  // Supabase — required (deferred validation)
  get supabaseUrl()          { return required(process.env.NEXT_PUBLIC_SUPABASE_URL,            "NEXT_PUBLIC_SUPABASE_URL"); },
  get supabaseAnonKey()      { return required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,       "NEXT_PUBLIC_SUPABASE_ANON_KEY"); },

  // App — required (deferred validation)
  get appUrl()               { return required(process.env.NEXT_PUBLIC_APP_URL,                 "NEXT_PUBLIC_APP_URL"); },

  // Optional — return undefined if not set
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  triggerPublicApiKey:  process.env.NEXT_PUBLIC_TRIGGER_PUBLIC_API_KEY,
  sentryDsn:            process.env.NEXT_PUBLIC_SENTRY_DSN,
  posthogKey:           process.env.NEXT_PUBLIC_POSTHOG_KEY,
  posthogHost:          process.env.NEXT_PUBLIC_POSTHOG_HOST,
};
