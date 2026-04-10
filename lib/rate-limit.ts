import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { serverEnv } from "@/lib/server-env";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Shared Redis connection — lazily created; null when Upstash is not configured.
// ---------------------------------------------------------------------------
let _limiters: ReturnType<typeof buildLimiters> | null = null;

function buildLimiters() {
  const redis = new Redis({
    url:   serverEnv.upstashRedisRestUrl!,
    token: serverEnv.upstashRedisRestToken!,
  });
  return {
    draft: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix:  "rl:draft",
    }),
    upload: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix:  "rl:upload",
    }),
    checkout: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "5 m"),
      prefix:  "rl:checkout",
    }),
    general: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix:  "rl:general",
    }),
  } as const;
}

function getLimiters() {
  if (!serverEnv.upstashRedisRestUrl || !serverEnv.upstashRedisRestToken) return null;
  if (!_limiters) _limiters = buildLimiters();
  return _limiters;
}

export type LimiterName = "draft" | "upload" | "checkout" | "general";

// ---------------------------------------------------------------------------
// resolveIdentifier()
//
// Prefer the authenticated user ID so every account gets its own bucket.
// Fall back to IP when the user is unauthenticated (public endpoints, bots).
// Returns "unknown" only if both are unavailable — never throws.
// ---------------------------------------------------------------------------
function resolveIdentifier(
  userId: string | null | undefined,
  request: NextRequest,
): string {
  if (userId) return `user:${userId}`;

  // Vercel sets x-forwarded-for; fall back to x-real-ip, then cf-connecting-ip.
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    (forwarded ? forwarded.split(",")[0].trim() : null) ??
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown";

  return `ip:${ip}`;
}

// ---------------------------------------------------------------------------
// RateLimitResult
// ---------------------------------------------------------------------------
export interface RateLimitResult {
  /** false = request should be rejected */
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix ms timestamp when the window resets */
  reset: number;
  /** The identifier that was checked (for logging) */
  identifier: string;
}

// ---------------------------------------------------------------------------
// checkRateLimit()
//
// Usage:
//   const rl = await checkRateLimit("draft", userId, request);
//   if (!rl.allowed) return rateLimitResponse(rl);
// ---------------------------------------------------------------------------
export async function checkRateLimit(
  limiter: LimiterName,
  userId: string | null | undefined,
  request: NextRequest,
): Promise<RateLimitResult> {
  const identifier = resolveIdentifier(userId, request);
  const limiters   = getLimiters();

  // Redis not configured — allow all requests
  if (!limiters) {
    return { allowed: true, limit: 0, remaining: 0, reset: 0, identifier };
  }

  const result = await limiters[limiter].limit(identifier);
  return {
    allowed:    result.success,
    limit:      result.limit,
    remaining:  result.remaining,
    reset:      result.reset,
    identifier,
  };
}

// ---------------------------------------------------------------------------
// rateLimitResponse()
//
// Builds a standard 429 NextResponse with Retry-After and X-RateLimit-* headers.
// Call this when checkRateLimit returns allowed === false.
// ---------------------------------------------------------------------------
export function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfterSec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return new Response(
    JSON.stringify({ error: "rate_limited", retryAfter: result.reset }),
    {
      status: 429,
      headers: {
        "Content-Type":          "application/json",
        "X-RateLimit-Limit":     String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset":     String(result.reset),
        "Retry-After":           String(retryAfterSec),
      },
    },
  );
}

// ---------------------------------------------------------------------------
// rateLimitHeaders()
//
// Returns headers to attach to successful responses so clients can track
// their remaining quota without needing a 429 to discover limits.
// ---------------------------------------------------------------------------
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit":     String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset":     String(result.reset),
  };
}
