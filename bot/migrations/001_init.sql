
-- Миграция 001 - инициализация схемы базы данных

CREATE TABLE IF NOT EXISTS chats (
    chat_id     BIGINT PRIMARY KEY,
    title       TEXT,
    chat_type   TEXT NOT NULL,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active   BOOLEAN NOT NULL DEFAULT true
);
 
CREATE TABLE IF NOT EXISTS messages (
    id              BIGSERIAL PRIMARY KEY,
    telegram_msg_id BIGINT NOT NULL,
    chat_id         BIGINT NOT NULL REFERENCES chats(chat_id),
    user_id         BIGINT,
    username        TEXT,
    first_name      TEXT,
    message_type    TEXT NOT NULL,
    text_content    TEXT,
    reply_to_msg_id BIGINT,
    sent_at         TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
 
    UNIQUE (chat_id, telegram_msg_id)
);
 
CREATE INDEX IF NOT EXISTS idx_messages_chat_sent ON messages (chat_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_messages_reply ON messages (chat_id, reply_to_msg_id) WHERE reply_to_msg_id IS NOT NULL;
 
CREATE TABLE IF NOT EXISTS summaries (
    id              BIGSERIAL PRIMARY KEY,
    chat_id         BIGINT NOT NULL REFERENCES chats(chat_id),
    requested_by    BIGINT,
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,
    message_count   INTEGER NOT NULL,
    summary_text    TEXT NOT NULL,
    model_used      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
 
CREATE INDEX IF NOT EXISTS idx_summaries_chat_created ON summaries (chat_id, created_at);
