alter table public.sessions
  add column answers jsonb not null default '{}';
