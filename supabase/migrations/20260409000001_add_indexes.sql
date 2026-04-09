-- ============================================================
-- user_id indexes
-- sessions and payos_orders already indexed in 000000.
-- ============================================================
create index uploads_user_id_idx       on uploads(user_id);
create index drafts_user_id_idx        on drafts(user_id);
create index exports_user_id_idx       on exports(user_id);
create index feedback_user_id_idx      on feedback(user_id);
create index outcome_emails_user_id_idx on outcome_emails(user_id);

-- ============================================================
-- status + scheduled_at composite index on sessions
-- Enables efficient queue queries:
--   WHERE status = 'pending' AND scheduled_at <= now()
-- ============================================================
alter table sessions add column scheduled_at timestamptz;

create index sessions_status_scheduled_at_idx on sessions(status, scheduled_at);
