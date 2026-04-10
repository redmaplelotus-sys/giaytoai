/**
 * Server-only environment variables.
 * NEVER import this file in client components or any module that is
 * part of the client bundle (e.g. app/providers.tsx, lib/supabase.ts).
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/** Returns the value or undefined — for services that degrade gracefully when absent. */
function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const serverEnv = {
  // Anthropic — required
  anthropicApiKey: requireEnv("ANTHROPIC_API_KEY"),

  // Helicone — optional (LLM cost tracking proxy; skipped when unset)
  heliconeApiKey: optionalEnv("HELICONE_API_KEY"),

  // Clerk — required
  clerkSecretKey:     requireEnv("CLERK_SECRET_KEY"),
  clerkWebhookSecret: requireEnv("CLERK_WEBHOOK_SECRET"),

  // Supabase — required
  supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),

  // Stripe — optional (payment routes fail gracefully when unset)
  stripeSecretKey:      optionalEnv("STRIPE_SECRET_KEY"),
  stripeWebhookSecret:  optionalEnv("STRIPE_WEBHOOK_SECRET"),
  stripePriceStarter:   optionalEnv("STRIPE_PRICE_STARTER"),
  stripePriceStandard:  optionalEnv("STRIPE_PRICE_STANDARD"),
  stripePricePro:       optionalEnv("STRIPE_PRICE_PRO"),
  stripePriceUnlimited: optionalEnv("STRIPE_PRICE_UNLIMITED"),

  // PayOS — optional (Vietnamese payment routes fail gracefully when unset)
  payosClientId:    optionalEnv("PAYOS_CLIENT_ID"),
  payosApiKey:      optionalEnv("PAYOS_API_KEY"),
  payosChecksumKey: optionalEnv("PAYOS_CHECKSUM_KEY"),

  // Cloudflare R2 — required (exports and uploads won't work without it)
  cfAccountId:          requireEnv("CF_ACCOUNT_ID"),
  cfR2AccessKeyId:      requireEnv("CF_R2_ACCESS_KEY_ID"),
  cfR2SecretAccessKey:  requireEnv("CF_R2_SECRET_ACCESS_KEY"),
  cfR2BucketName:       requireEnv("CF_R2_BUCKET_NAME"),

  // Upstash Redis — required (rate limiting)
  upstashRedisRestUrl:   requireEnv("UPSTASH_REDIS_REST_URL"),
  upstashRedisRestToken: requireEnv("UPSTASH_REDIS_REST_TOKEN"),

  // Resend — optional (email sending fails gracefully when unset)
  resendApiKey:    optionalEnv("RESEND_API_KEY"),
  resendFromEmail: optionalEnv("RESEND_FROM_EMAIL"),

  // Trigger.dev — optional (background jobs skipped when unset)
  triggerSecretKey: optionalEnv("TRIGGER_SECRET_KEY"),

  // Sentry — optional (error tracking skipped when unset)
  sentryDsn: optionalEnv("SENTRY_DSN"),
};
