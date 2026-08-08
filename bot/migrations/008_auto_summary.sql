-- 008_auto_summary.sql
--
-- Automatic periodic summary ("once every N time").
--
-- auto_summary_thread_id  — topic ID (message_thread_id) where the
--   auto-summary will be posted. NULL = general chat / General forum topic.
--   Set via the /setsummarythread command issued inside the target
--   topic (see handlers.js) — we do not attempt to guess the topic automatically.
--
-- auto_summary_last_run_at — when the scheduler last actually
--   ran the auto-summary for the chat. Kept separate from summaries.is_checkpoint
--   so that enabling/disabling the feature doesn't mess with manual /summary checkpoints.
--
-- message_thread_id on messages — used to scope the contents of the
--   auto-summary to the same topic where it is being posted (otherwise, in a forum
--   with multiple topics, a summary for the "Logistics" topic would end up
--   recapitulating messages from the "Memes" topic).
--
-- Enabled state/frequency (autoSummary.enabled + intervalMinutes) is stored
-- in chat_settings.features, just like cigarette/bully — we don't add
-- separate columns for this to avoid duplicating the mechanism.

ALTER TABLE chat_settings
    ADD COLUMN IF NOT EXISTS auto_summary_thread_id   BIGINT,
    ADD COLUMN IF NOT EXISTS auto_summary_last_run_at TIMESTAMPTZ;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_thread_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_messages_thread
    ON messages (chat_id, message_thread_id) WHERE message_thread_id IS NOT NULL;