/**
 * Server-only environment variables.
 * NEVER import this file in client components or any module that is
 * part of the client bundle (e.g. app/providers.tsx, lib/supabase.ts).
 *
 * Required values use getters so the throw is deferred until access.
 * This lets non-Next.js runtimes (Trigger.dev task indexing, scripts,
 * tests) import this module without crashing when vars aren't set.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const serverEnv = {
  // Required — deferred validation
  get anthropicApiKey()        { return requireEnv("ANTHROPIC_API_KEY"); },
  get clerkSecretKey()         { return requireEnv("CLERK_SECRET_KEY"); },
  get clerkWebhookSecret()     { return requireEnv("CLERK_WEBHOOK_SECRET"); },
  get supabaseServiceRoleKey() { return requireEnv("SUPABASE_SERVICE_ROLE_KEY"); },

  // Optional — undefined if not set
  heliconeApiKey:        process.env.HELICONE_API_KEY || undefined,

  stripeSecretKey:       process.env.STRIPE_SECRET_KEY        || undefined,
  stripeWebhookSecret:   process.env.STRIPE_WEBHOOK_SECRET    || undefined,
  stripePriceStarter:    process.env.STRIPE_PRICE_STARTER     || undefined,
  stripePriceStandard:   process.env.STRIPE_PRICE_STANDARD    || undefined,
  stripePricePro:        process.env.STRIPE_PRICE_PRO         || undefined,
  stripePriceUnlimited:  process.env.STRIPE_PRICE_UNLIMITED   || undefined,

  payosClientId:         process.env.PAYOS_CLIENT_ID          || undefined,
  payosApiKey:           process.env.PAYOS_API_KEY            || undefined,
  payosChecksumKey:      process.env.PAYOS_CHECKSUM_KEY       || undefined,

  cfAccountId:           process.env.CF_ACCOUNT_ID            || undefined,
  cfR2AccessKeyId:       process.env.CF_R2_ACCESS_KEY_ID      || undefined,
  cfR2SecretAccessKey:   process.env.CF_R2_SECRET_ACCESS_KEY  || undefined,
  cfR2BucketName:        process.env.CF_R2_BUCKET_NAME        || undefined,

  upstashRedisRestUrl:   process.env.UPSTASH_REDIS_REST_URL   || undefined,
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN || undefined,

  resendApiKey:          process.env.RESEND_API_KEY           || undefined,
  resendFromEmail:       process.env.RESEND_FROM_EMAIL        || undefined,

  triggerSecretKey:      process.env.TRIGGER_SECRET_KEY       || undefined,

  sentryDsn:             process.env.SENTRY_DSN               || undefined,
};
