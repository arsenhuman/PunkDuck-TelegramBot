-- Migration 003: distinguish between "checkpoint" summaries (/summary without an argument,
-- which advance the "last summary" checkpoint) and one-off summaries
-- (/summary 6h, /summary 24h, etc.), which simply display the requested time period
-- and do not affect the checkpoint.

ALTER TABLE summaries ADD COLUMN IF NOT EXISTS is_checkpoint BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_summaries_checkpoint ON summaries (chat_id, is_checkpoint, period_end);