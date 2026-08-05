-- 005_settings_extensions.sql
ALTER TABLE chat_settings ADD COLUMN intensity TEXT NOT NULL DEFAULT 'normal';
-- 'soft' | 'normal' | 'toxic'

CREATE TABLE IF NOT EXISTS chat_media (
    id            SERIAL PRIMARY KEY,
    chat_id       BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    telegram_file_id TEXT NOT NULL,
    added_by      BIGINT,
    added_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_media_chat ON chat_media (chat_id);