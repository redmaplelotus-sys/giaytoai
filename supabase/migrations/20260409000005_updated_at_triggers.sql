-- document_types, prompt_versions, and drafts have no updated_at yet.
-- users and sessions already have the column + trigger (migration 000000).

alter table public.document_types  add column updated_at timestamptz not null default now();
alter table public.prompt_versions  add column updated_at timestamptz not null default now();
alter table public.drafts           add column updated_at timestamptz not null default now();

create trigger document_types_updated_at
  before update on public.document_types
  for each row execute function public.set_updated_at();

create trigger prompt_versions_updated_at
  before update on public.prompt_versions
  for each row execute function public.set_updated_at();

create trigger drafts_updated_at
  before update on public.drafts
  for each row execute function public.set_updated_at();
