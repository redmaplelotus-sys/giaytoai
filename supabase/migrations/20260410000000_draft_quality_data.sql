-- Store the full quality report JSON alongside the averaged score.
-- Nullable — null means the quality check has not completed yet (still processing).
alter table public.drafts
  add column quality_data jsonb;
