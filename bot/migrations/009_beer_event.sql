-- migration 009 - PunkDuck asks for a beer

CREATE TABLE IF NOT EXISTS beer_events (
    id                   BIGSERIAL PRIMARY KEY,
    chat_id              BIGINT NOT NULL REFERENCES chats(chat_id),
    bot_msg_id           BIGINT NOT NULL,
    requested_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    given_by_user_id     BIGINT,
    given_by_first_name  TEXT,
    given_at             TIMESTAMPTZ,

    UNIQUE (chat_id, bot_msg_id)
);

CREATE INDEX IF NOT EXISTS idx_beer_events_chat ON beer_events (chat_id, requested_at);