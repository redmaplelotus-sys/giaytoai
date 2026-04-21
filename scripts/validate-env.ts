/**
 * Preflight environment validation — runs before `next build`.
 * Aborts the deploy if any required env var is missing or invalid.
 *
 * In production: also enforces that Stripe uses live keys.
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

function check(name: string, opts: { prefix?: string; live?: boolean } = {}) {
  const value = process.env[name];
  if (!value) {
    errors.push(`Missing required env var: ${name}`);
    return;
  }
  if (opts.prefix && !value.startsWith(opts.prefix)) {
    errors.push(`${name} must start with "${opts.prefix}" (got prefix "${value.slice(0, 8)}…")`);
  }
  if (opts.live && isProd && !value.includes("_live_")) {
    errors.push(`${name} must be a LIVE key in production (got test key)`);
  }
}

function optional(name: string, opts: { prefix?: string } = {}) {
  const value = process.env[name];
  if (!value) {
    warnings.push(`Optional env var not set: ${name}`);
    return;
  }
  if (opts.prefix && !value.startsWith(opts.prefix)) {
    errors.push(`${name} must start with "${opts.prefix}" (got prefix "${value.slice(0, 8)}…")`);
  }
}

// ── Required everywhere ────────────────────────────────────────────────────
check("ANTHROPIC_API_KEY",              { prefix: "sk-ant-" });
check("CLERK_SECRET_KEY",               { prefix: "sk_" });
check("CLERK_WEBHOOK_SECRET",           { prefix: "whsec_" });
check("SUPABASE_SERVICE_ROLE_KEY");
check("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", { prefix: "pk_" });
check("NEXT_PUBLIC_CLERK_SIGN_IN_URL");
check("NEXT_PUBLIC_CLERK_SIGN_UP_URL");
check("NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL");
check("NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL");
check("NEXT_PUBLIC_SUPABASE_URL");
check("NEXT_PUBLIC_SUPABASE_ANON_KEY");
check("NEXT_PUBLIC_APP_URL");

// ── Production-only: Clerk must be live ───────────────────────────────────
if (isProd) {
  const clerkSecret = process.env.CLERK_SECRET_KEY ?? "";
  const clerkPub = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  if (clerkSecret.startsWith("sk_test_")) {
    errors.push("CLERK_SECRET_KEY must be sk_live_* in production (got sk_test_*)");
  }
  if (clerkPub.startsWith("pk_test_")) {
    errors.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be pk_live_* in production (got pk_test_*)");
  }
}

// ── Stripe: live keys required in production ──────────────────────────────
check("STRIPE_SECRET_KEY",      { prefix: "sk_", live: true });
check("STRIPE_WEBHOOK_SECRET",  { prefix: "whsec_" });
check("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", { prefix: "pk_", live: true });
check("STRIPE_PRICE_STARTER",   { prefix: "price_" });
check("STRIPE_PRICE_STANDARD",  { prefix: "price_" });
check("STRIPE_PRICE_PRO",       { prefix: "price_" });
check("STRIPE_PRICE_UNLIMITED", { prefix: "price_" });

// ── PayOS (optional — VND payments) ───────────────────────────────────────
optional("PAYOS_CLIENT_ID");
optional("PAYOS_API_KEY");
optional("PAYOS_CHECKSUM_KEY");

// ── R2 (required for export) ──────────────────────────────────────────────
check("CF_ACCOUNT_ID");
check("CF_R2_ACCESS_KEY_ID");
check("CF_R2_SECRET_ACCESS_KEY");
check("CF_R2_BUCKET_NAME");

// ── Rate limiting (optional — bypassed when unset) ────────────────────────
optional("UPSTASH_REDIS_REST_URL");
optional("UPSTASH_REDIS_REST_TOKEN");

// ── Email (required for outcome emails + account delete confirmations) ────
check("RESEND_API_KEY", { prefix: "re_" });
optional("RESEND_FROM_EMAIL");

// ── Background jobs (optional — skipped when unset) ───────────────────────
optional("TRIGGER_SECRET_KEY");

// ── Observability (optional) ──────────────────────────────────────────────
optional("HELICONE_API_KEY");
optional("SENTRY_DSN");
optional("NEXT_PUBLIC_POSTHOG_KEY");

// ── Report & exit ─────────────────────────────────────────────────────────
const env = isProd ? "PRODUCTION" : "preview/dev";
console.log(`\n[validate-env] Running ${env} preflight checks…\n`);

if (warnings.length > 0) {
  console.log("⚠  Warnings:");
  for (const w of warnings) console.log(`   - ${w}`);
  console.log();
}

if (errors.length > 0) {
  console.error("❌ Validation failed:");
  for (const e of errors) console.error(`   - ${e}`);
  console.error(`\nAborting build. Fix the above and redeploy.\n`);
  process.exit(1);
}

console.log(`✓ All required env vars validated (${env}).\n`);
