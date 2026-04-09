-- ============================================================
-- add_credits(clerk_id, amount)
-- Unconditionally adds credits. Used by webhooks after payment.
-- ============================================================
create or replace function add_credits(
  p_clerk_id  text,
  p_amount    integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  update public.users
  set    credits_remaining = credits_remaining + p_amount
  where  clerk_id = p_clerk_id;

  if not found then
    raise exception 'user not found: %', p_clerk_id;
  end if;
end;
$$;


-- ============================================================
-- consume_credit(clerk_id)
-- Deducts one credit atomically. Skips deduction for unlimited
-- plan users. Raises an exception if the user has no credits.
-- ============================================================
create or replace function consume_credit(
  p_clerk_id  text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan     text;
  v_credits  integer;
begin
  -- Lock the row for the duration of this transaction so
  -- concurrent calls cannot double-spend the same credit.
  select plan, credits_remaining
  into   v_plan, v_credits
  from   public.users
  where  clerk_id = p_clerk_id
  for update;

  if not found then
    raise exception 'user not found: %', p_clerk_id;
  end if;

  if v_plan = 'unlimited' then
    return;
  end if;

  if v_credits < 1 then
    raise exception 'insufficient credits for user %', p_clerk_id;
  end if;

  update public.users
  set    credits_remaining = credits_remaining - 1
  where  clerk_id = p_clerk_id;
end;
$$;


-- ============================================================
-- refund_credit(clerk_id, amount)
-- Returns credits after a failed or cancelled job.
-- ============================================================
create or replace function refund_credit(
  p_clerk_id  text,
  p_amount    integer default 1
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  update public.users
  set    credits_remaining = credits_remaining + p_amount
  where  clerk_id = p_clerk_id;

  if not found then
    raise exception 'user not found: %', p_clerk_id;
  end if;
end;
$$;


-- ============================================================
-- set_unlimited_plan(clerk_id)
-- Upgrades a user to the unlimited plan. Credits are left as-is
-- since consume_credit() skips deduction for unlimited users.
-- ============================================================
create or replace function set_unlimited_plan(
  p_clerk_id  text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users
  set    plan = 'unlimited'
  where  clerk_id = p_clerk_id;

  if not found then
    raise exception 'user not found: %', p_clerk_id;
  end if;
end;
$$;
