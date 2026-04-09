alter table public.users
  add column locale text not null default 'vi'
  check (locale in ('vi', 'en'));
