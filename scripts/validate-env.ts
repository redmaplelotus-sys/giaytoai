/**
 * Preflight environment validation — runs before `next build`.
 * Aborts the deploy only if core infrastructure vars are missing.
 *
 * Everything else (Stripe, R2, Resend, PayOS, Trigger.dev, etc.) is
 * optional — routes that need them will fail gracefully at runtime.
 * Run via: `npm run validate-env` (called from prebuild).
 */

// Load .env.local for local runs (Vercel provides env vars natively)
if (!process.env.VERCEL) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("dotenv").config({ path: ".env.local" });
  } catch {
    // dotenv not installed — skip; Vercel builds have env vars already
  }
}

const isProd =
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";

const errors: string[] = [];
const warnings: string[] = [];

function check(name: string, opts: { prefix?: string } = {}) {
  const value = process.env[name];
  if (!value) {
    errors.push(`Missing required env var: ${name}`);
    return;
  }
  if (opts.prefix && !value.startsWith(opts.prefix)) {
    errors.push(`${name} must start with "${opts.prefix}" (got prefix "${value.slice(0, 8)}…")`);
  }
}

function optional(name: string, opts: { prefix?: string } = {}) {
  const value = process.env[name];
  if (!value) {
    warnings.push(`Optional env var not set: ${name}`);
    return;
  }
  if (opts.prefix && !value.startsWith(opts.prefix)) {
    warnings.push(`${name} does not start with "${opts.prefix}" (got prefix "${value.slice(0, 8)}…")`);
  }
}

// ── Required: core app can't run without these ────────────────────────────
check("ANTHROPIC_API_KEY",                  { prefix: "sk-ant-" });
check("CLERK_SECRET_KEY",                   { prefix: "sk_" });
check("CLERK_WEBHOOK_SECRET",               { prefix: "whsec_" });
check("SUPABASE_SERVICE_ROLE_KEY");
check("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",  { prefix: "pk_" });
check("NEXT_PUBLIC_CLERK_SIGN_IN_URL");
check("NEXT_PUBLIC_CLERK_SIGN_UP_URL");
check("NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL");
check("NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL");
check("NEXT_PUBLIC_SUPABASE_URL");
check("NEXT_PUBLIC_SUPABASE_ANON_KEY");
check("NEXT_PUBLIC_APP_URL");

// ── Optional: payment, export, email, background jobs, observability ─────
optional("STRIPE_SECRET_KEY",                  { prefix: "sk_" });
optional("STRIPE_WEBHOOK_SECRET",              { prefix: "whsec_" });
optional("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", { prefix: "pk_" });
optional("STRIPE_PRICE_STARTER",               { prefix: "price_" });
optional("STRIPE_PRICE_STANDARD",              { prefix: "price_" });
optional("STRIPE_PRICE_PRO",                   { prefix: "price_" });
optional("STRIPE_PRICE_UNLIMITED",             { prefix: "price_" });

optional("PAYOS_CLIENT_ID");
optional("PAYOS_API_KEY");
optional("PAYOS_CHECKSUM_KEY");

optional("CF_ACCOUNT_ID");
optional("CF_R2_ACCESS_KEY_ID");
optional("CF_R2_SECRET_ACCESS_KEY");
optional("CF_R2_BUCKET_NAME");

optional("UPSTASH_REDIS_REST_URL");
optional("UPSTASH_REDIS_REST_TOKEN");

optional("RESEND_API_KEY",   { prefix: "re_" });
optional("RESEND_FROM_EMAIL");

optional("TRIGGER_SECRET_KEY");

optional("HELICONE_API_KEY");
optional("SENTRY_DSN");
optional("NEXT_PUBLIC_POSTHOG_KEY");

// ── Report & exit ─────────────────────────────────────────────────────────
const env = isProd ? "PRODUCTION" : "preview/dev";
console.log(`\n[validate-env] Running ${env} preflight checks…\n`);

if (warnings.length > 0) {
  console.log("⚠  Warnings (non-fatal — features will fail gracefully):");
  for (const w of warnings) console.log(`   - ${w}`);
  console.log();
}

if (errors.length > 0) {
  console.error("❌ Validation failed:");
  for (const e of errors) console.error(`   - ${e}`);
  console.error(`\nAborting build. Fix the above and redeploy.\n`);
  process.exit(1);
}

console.log(`✓ Core env vars validated (${env}).\n`);
