-- Quality assessment fields on drafts
alter table public.drafts
  add column quality_score   smallint check (quality_score between 1 and 5),
  add column quality_feedback text;

-- Scheduled send time for outcome emails (null = send immediately)
alter table public.outcome_emails
  add column send_at timestamptz;
