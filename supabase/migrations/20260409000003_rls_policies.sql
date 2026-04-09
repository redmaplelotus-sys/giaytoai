-- ============================================================
-- current_user_id()
-- Extracts the Clerk user ID (sub claim) from the JWT so
-- every RLS policy has a single place to change if the claim
-- path ever moves.
-- ============================================================
create or replace function current_user_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select current_setting('request.jwt.claims', true)::jsonb->>'sub'
$$;


-- ============================================================
-- Drop the broad FOR ALL policies created in migration 000000
-- and replace them with explicit read / insert / update policies.
-- ============================================================
drop policy if exists "users: own row"          on public.users;
drop policy if exists "document_types: public read" on public.document_types;
drop policy if exists "sessions: own rows"      on public.sessions;
drop policy if exists "uploads: own rows"       on public.uploads;
drop policy if exists "drafts: own rows"        on public.drafts;
drop policy if exists "exports: own rows"       on public.exports;
drop policy if exists "feedback: own rows"      on public.feedback;
drop policy if exists "payos_orders: own rows"  on public.payos_orders;


-- ============================================================
-- users
-- Insert is handled server-side by the Clerk webhook (service role).
-- ============================================================
create policy "users: select own"
  on public.users for select
  using (clerk_id = public.current_user_id());

create policy "users: update own"
  on public.users for update
  using (clerk_id = public.current_user_id());


-- ============================================================
-- document_types  (public read-only catalog)
-- ============================================================
create policy "document_types: select all"
  on public.document_types for select
  using (true);


-- ============================================================
-- sessions
-- ============================================================
create policy "sessions: select own"
  on public.sessions for select
  using (user_id = public.current_user_id());

create policy "sessions: insert own"
  on public.sessions for insert
  with check (user_id = public.current_user_id());

create policy "sessions: update own"
  on public.sessions for update
  using (user_id = public.current_user_id());


-- ============================================================
-- uploads
-- ============================================================
create policy "uploads: select own"
  on public.uploads for select
  using (user_id = public.current_user_id());

create policy "uploads: insert own"
  on public.uploads for insert
  with check (user_id = public.current_user_id());


-- ============================================================
-- drafts
-- ============================================================
create policy "drafts: select own"
  on public.drafts for select
  using (user_id = public.current_user_id());

create policy "drafts: insert own"
  on public.drafts for insert
  with check (user_id = public.current_user_id());

create policy "drafts: update own"
  on public.drafts for update
  using (user_id = public.current_user_id());


-- ============================================================
-- exports
-- Created server-side; clients only read.
-- ============================================================
create policy "exports: select own"
  on public.exports for select
  using (user_id = public.current_user_id());


-- ============================================================
-- feedback
-- ============================================================
create policy "feedback: select own"
  on public.feedback for select
  using (user_id = public.current_user_id());

create policy "feedback: insert own"
  on public.feedback for insert
  with check (user_id = public.current_user_id());

create policy "feedback: update own"
  on public.feedback for update
  using (user_id = public.current_user_id());


-- ============================================================
-- stripe_events  (service role only — no client policies)
-- ============================================================


-- ============================================================
-- outcome_emails  (service role only — no client policies)
-- ============================================================


-- ============================================================
-- payos_orders
-- Status transitions are server-side; clients only read and create.
-- ============================================================
create policy "payos_orders: select own"
  on public.payos_orders for select
  using (user_id = public.current_user_id());

create policy "payos_orders: insert own"
  on public.payos_orders for insert
  with check (user_id = public.current_user_id());
