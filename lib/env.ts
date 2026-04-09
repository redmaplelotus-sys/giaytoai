function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// ---------------------------------------------------------------------------
// Server-only env — never import this in client components or client modules
// ---------------------------------------------------------------------------
function buildServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv must not be imported on the client");
  }
  return {
    // Anthropic
    anthropicApiKey: requireEnv("ANTHROPIC_API_KEY"),

    // Helicone
    heliconeApiKey: requireEnv("HELICONE_API_KEY"),

    // Clerk
    clerkSecretKey: requireEnv("CLERK_SECRET_KEY"),
    clerkWebhookSecret: requireEnv("CLERK_WEBHOOK_SECRET"),

    // Supabase
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),

    // Stripe
    stripeSecretKey: requireEnv("STRIPE_SECRET_KEY"),
    stripeWebhookSecret: requireEnv("STRIPE_WEBHOOK_SECRET"),
    stripePriceStarter: requireEnv("STRIPE_PRICE_STARTER"),
    stripePriceStandard: requireEnv("STRIPE_PRICE_STANDARD"),
    stripePricePro: requireEnv("STRIPE_PRICE_PRO"),
    stripePriceUnlimited: requireEnv("STRIPE_PRICE_UNLIMITED"),

    // PayOS
    payosClientId: requireEnv("PAYOS_CLIENT_ID"),
    payosApiKey: requireEnv("PAYOS_API_KEY"),
    payosChecksumKey: requireEnv("PAYOS_CHECKSUM_KEY"),

    // Cloudflare R2
    cfAccountId: requireEnv("CF_ACCOUNT_ID"),
    cfR2AccessKeyId: requireEnv("CF_R2_ACCESS_KEY_ID"),
    cfR2SecretAccessKey: requireEnv("CF_R2_SECRET_ACCESS_KEY"),
    cfR2BucketName: requireEnv("CF_R2_BUCKET_NAME"),

    // Upstash Redis
    upstashRedisRestUrl: requireEnv("UPSTASH_REDIS_REST_URL"),
    upstashRedisRestToken: requireEnv("UPSTASH_REDIS_REST_TOKEN"),

    // Resend
    resendApiKey: requireEnv("RESEND_API_KEY"),
    resendFromEmail: requireEnv("RESEND_FROM_EMAIL"),

    // Trigger.dev
    triggerSecretKey: requireEnv("TRIGGER_SECRET_KEY"),

    // Sentry
    sentryDsn: requireEnv("SENTRY_DSN"),
  };
}

export const serverEnv = buildServerEnv();

// ---------------------------------------------------------------------------
// Client env — safe to import anywhere (values must be NEXT_PUBLIC_*)
// ---------------------------------------------------------------------------
export const clientEnv = {
  // Clerk
  clerkPublishableKey: requireEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  clerkSignInUrl: requireEnv("NEXT_PUBLIC_CLERK_SIGN_IN_URL"),
  clerkSignUpUrl: requireEnv("NEXT_PUBLIC_CLERK_SIGN_UP_URL"),
  clerkAfterSignInUrl: requireEnv("NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL"),
  clerkAfterSignUpUrl: requireEnv("NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL"),

  // Supabase
  supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),

  // Stripe
  stripePublishableKey: requireEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),

  // Trigger.dev
  triggerPublicApiKey: requireEnv("NEXT_PUBLIC_TRIGGER_PUBLIC_API_KEY"),

  // Sentry
  sentryDsn: requireEnv("NEXT_PUBLIC_SENTRY_DSN"),

  // PostHog
  posthogKey: requireEnv("NEXT_PUBLIC_POSTHOG_KEY"),
  posthogHost: requireEnv("NEXT_PUBLIC_POSTHOG_HOST"),

  // App
  appUrl: requireEnv("NEXT_PUBLIC_APP_URL"),
};
