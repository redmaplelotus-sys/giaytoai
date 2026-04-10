/**
 * Client-safe environment variables — safe to import anywhere.
 * For server-only secrets import from "@/lib/server-env" instead.
 *
 * IMPORTANT: Each value must use a static `process.env.NEXT_PUBLIC_*` literal.
 * Next.js only inlines NEXT_PUBLIC_ vars when accessed via literal property
 * access — dynamic access like process.env[name] is never replaced in the
 * client bundle and always returns undefined.
 */

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const clientEnv = {
  // Clerk
  clerkPublishableKey:    required(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  clerkSignInUrl:         required(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,         "NEXT_PUBLIC_CLERK_SIGN_IN_URL"),
  clerkSignUpUrl:         required(process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,         "NEXT_PUBLIC_CLERK_SIGN_UP_URL"),
  clerkAfterSignInUrl:    required(process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,   "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL"),
  clerkAfterSignUpUrl:    required(process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,   "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL"),

  // Supabase
  supabaseUrl:            required(process.env.NEXT_PUBLIC_SUPABASE_URL,              "NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey:        required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,         "NEXT_PUBLIC_SUPABASE_ANON_KEY"),

  // Stripe
  stripePublishableKey:   required(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),

  // Trigger.dev
  triggerPublicApiKey:    required(process.env.NEXT_PUBLIC_TRIGGER_PUBLIC_API_KEY,    "NEXT_PUBLIC_TRIGGER_PUBLIC_API_KEY"),

  // Sentry
  sentryDsn:              required(process.env.NEXT_PUBLIC_SENTRY_DSN,                "NEXT_PUBLIC_SENTRY_DSN"),

  // PostHog
  posthogKey:             required(process.env.NEXT_PUBLIC_POSTHOG_KEY,               "NEXT_PUBLIC_POSTHOG_KEY"),
  posthogHost:            required(process.env.NEXT_PUBLIC_POSTHOG_HOST,              "NEXT_PUBLIC_POSTHOG_HOST"),

  // App
  appUrl:                 required(process.env.NEXT_PUBLIC_APP_URL,                   "NEXT_PUBLIC_APP_URL"),
};
