# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
```

**Supabase local dev:**
```bash
supabase start    # Start local Supabase stack (DB on :54322, Studio on :54323)
supabase stop     # Stop local stack
supabase db reset # Reset DB and re-run migrations + seed
supabase db diff  # Generate migration from schema changes
```

Copy `.env.local.example` to `.env.local` and fill in all values before running locally.

## Architecture

**Giấy Tờ AI** is a Vietnamese AI-powered document processing SaaS. The tech stack:

| Concern | Service |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Auth | Clerk (with webhook to sync users into Supabase) |
| Database | Supabase (Postgres + RLS) |
| AI | Anthropic Claude API, proxied via Helicone for cost tracking |
| Payments | Stripe (international/USD) + PayOS (Vietnamese VND) |
| File storage | Cloudflare R2 |
| Rate limiting | Upstash Redis |
| Email | Resend (`noreply@giaytoai.com`) |
| Background jobs | Trigger.dev |
| Error tracking | Sentry |
| Analytics | PostHog |

**Key conventions:**
- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security — only use server-side (Route Handlers, Server Actions, server components). Never expose to the client.
- `NEXT_PUBLIC_*` env vars are safe for client use; all others are server-only.
- Clerk handles authentication UI and JWT issuance; Supabase uses Clerk as a third-party auth provider (see `supabase/config.toml` `[auth.third_party.clerk]`).
- Tailwind CSS v4 uses `@import "tailwindcss"` and `@theme inline {}` blocks — not the v3 `tailwind.config.js` approach. Read `node_modules/next/dist/docs/` before using any Next.js API, as Next.js 16 has breaking changes from prior versions.
