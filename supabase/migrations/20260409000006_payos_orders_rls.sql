-- Orders are created server-side via the PayOS API; clients must not
-- insert rows directly. Drop the insert policy added in migration 000003.
drop policy if exists "payos_orders: insert own" on public.payos_orders;
