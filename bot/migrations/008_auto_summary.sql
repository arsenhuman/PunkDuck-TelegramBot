-- 008_auto_summary.sql
ALTER TABLE chat_settings
    ADD COLUMN IF NOT EXISTS auto_summary_thread_id   BIGINT,
    ADD COLUMN IF NOT EXISTS auto_summary_last_run_at TIMESTAMPTZ;