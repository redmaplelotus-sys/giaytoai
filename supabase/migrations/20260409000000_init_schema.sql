-- ============================================================
-- Utility: auto-update updated_at on row change
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- users
-- Synced from Clerk via webhook. clerk_id is the PK so it
-- can be joined without a lookup table.
-- ============================================================
create table users (
  clerk_id            text        primary key,
  email               text        not null unique,
  full_name           text,
  avatar_url          text,
  plan                text        not null default 'free'
                                  check (plan in ('free','starter','standard','pro','unlimited')),
  stripe_customer_id  text        unique,
  credits_remaining   integer     not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger users_updated_at
  before update on users
  for each row execute function set_updated_at();

alter table users enable row level security;
create policy "users: own row" on users
  for all using (clerk_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');


-- ============================================================
-- document_types
-- Catalog of document types the AI can process.
-- ============================================================
create table document_types (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        not null unique,
  name_vi     text        not null,
  name_en     text,
  description text,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

alter table document_types enable row level security;
create policy "document_types: public read" on document_types
  for select using (true);


-- ============================================================
-- prompt_versions
-- Versioned system + user-prompt templates per document type.
-- ============================================================
create table prompt_versions (
  id                    uuid        primary key default gen_random_uuid(),
  document_type_id      uuid        not null references document_types(id),
  version               integer     not null,
  system_prompt         text        not null,
  user_prompt_template  text        not null,
  is_active             boolean     not null default false,
  created_at            timestamptz not null default now(),
  unique (document_type_id, version)
);

alter table prompt_versions enable row level security;
-- Only service role writes; no direct client access needed.


-- ============================================================
-- sessions
-- One session = one end-to-end document processing flow.
-- ============================================================
create table sessions (
  id                uuid        primary key default gen_random_uuid(),
  user_id           text        not null references users(clerk_id),
  document_type_id  uuid        references document_types(id),
  status            text        not null default 'pending'
                                check (status in ('pending','processing','completed','failed')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index sessions_user_id_idx on sessions(user_id);

create trigger sessions_updated_at
  before update on sessions
  for each row execute function set_updated_at();

alter table sessions enable row level security;
create policy "sessions: own rows" on sessions
  for all using (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');


-- ============================================================
-- uploads
-- Files uploaded to Cloudflare R2 within a session.
-- ============================================================
create table uploads (
  id          uuid        primary key default gen_random_uuid(),
  session_id  uuid        not null references sessions(id) on delete cascade,
  user_id     text        not null references users(clerk_id),
  r2_key      text        not null,
  filename    text        not null,
  mime_type   text,
  size_bytes  bigint,
  created_at  timestamptz not null default now()
);

create index uploads_session_id_idx on uploads(session_id);

alter table uploads enable row level security;
create policy "uploads: own rows" on uploads
  for all using (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');


-- ============================================================
-- drafts
-- AI-generated document drafts within a session.
-- ============================================================
create table drafts (
  id                uuid        primary key default gen_random_uuid(),
  session_id        uuid        not null references sessions(id) on delete cascade,
  user_id           text        not null references users(clerk_id),
  prompt_version_id uuid        references prompt_versions(id),
  content           jsonb       not null default '{}',
  model             text,
  tokens_used       integer,
  created_at        timestamptz not null default now()
);

create index drafts_session_id_idx on drafts(session_id);

alter table drafts enable row level security;
create policy "drafts: own rows" on drafts
  for all using (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');


-- ============================================================
-- exports
-- Finalized files rendered from a draft (PDF, DOCX, etc.).
-- ============================================================
create table exports (
  id          uuid        primary key default gen_random_uuid(),
  draft_id    uuid        not null references drafts(id) on delete cascade,
  session_id  uuid        not null references sessions(id),
  user_id     text        not null references users(clerk_id),
  format      text        not null check (format in ('pdf','docx','html')),
  r2_key      text,
  created_at  timestamptz not null default now()
);

create index exports_session_id_idx on exports(session_id);

alter table exports enable row level security;
create policy "exports: own rows" on exports
  for all using (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');


-- ============================================================
-- feedback
-- User rating + comment on a draft or session.
-- ============================================================
create table feedback (
  id          uuid        primary key default gen_random_uuid(),
  session_id  uuid        not null references sessions(id) on delete cascade,
  user_id     text        not null references users(clerk_id),
  draft_id    uuid        references drafts(id),
  rating      smallint    check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);

create index feedback_session_id_idx on feedback(session_id);

alter table feedback enable row level security;
create policy "feedback: own rows" on feedback
  for all using (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');


-- ============================================================
-- stripe_events
-- Idempotent log of processed Stripe webhook events.
-- ============================================================
create table stripe_events (
  id            text        primary key,  -- Stripe event ID (evt_...)
  type          text        not null,
  payload       jsonb       not null,
  processed_at  timestamptz,
  created_at    timestamptz not null default now()
);

alter table stripe_events enable row level security;
-- Service role only; no client policies needed.


-- ============================================================
-- outcome_emails
-- Record of transactional emails sent via Resend.
-- ============================================================
create table outcome_emails (
  id          uuid        primary key default gen_random_uuid(),
  session_id  uuid        references sessions(id),
  user_id     text        references users(clerk_id),
  resend_id   text,
  type        text        not null,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index outcome_emails_session_id_idx on outcome_emails(session_id);

alter table outcome_emails enable row level security;
-- Service role only; no client policies needed.


-- ============================================================
-- payos_orders
-- PayOS payment orders for VND transactions.
-- ============================================================
create table payos_orders (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 text        not null references users(clerk_id),
  order_code              text        not null unique,
  amount_vnd              bigint      not null,
  description             text,
  plan                    text        check (plan in ('starter','standard','pro','unlimited')),
  status                  text        not null default 'pending'
                                      check (status in ('pending','paid','cancelled','expired')),
  payos_payment_link_id   text,
  payos_transaction_id    text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index payos_orders_user_id_idx on payos_orders(user_id);

create trigger payos_orders_updated_at
  before update on payos_orders
  for each row execute function set_updated_at();

alter table payos_orders enable row level security;
create policy "payos_orders: own rows" on payos_orders
  for all using (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');
