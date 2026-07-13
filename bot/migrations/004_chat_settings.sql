-- Migration 004: per-chat tenant settings (edition, plan, feature flags, usage limits)
--
-- This table backs the multi-edition / multi-tenant plan:
--   - "edition" selects a base feature/personality preset (dilirock | general | saas)
--   - "features" stores per-chat overrides on top of the edition preset (JSONB)
--   - "plan" + "usage_limits" will back paid tiers later (step 5)
--
-- Rows are created automatically (edition='general' by default) the first time
-- a chat is seen — see src/resolveTenant.js. After running this migration on the
-- server, mark your existing DiliRock org chat explicitly:
--
--   UPDATE chat_settings SET edition = 'dilirock' WHERE chat_id = <your_dilirock_chat_id>;
--
-- (find the chat_id via: SELECT chat_id, title FROM chats;)

CREATE TABLE IF NOT EXISTS chat_settings (
    chat_id       BIGINT PRIMARY KEY REFERENCES chats(chat_id) ON DELETE CASCADE,
    edition       TEXT NOT NULL DEFAULT 'general',
    plan          TEXT NOT NULL DEFAULT 'free',
    language      TEXT NOT NULL DEFAULT 'ru',
    features      JSONB NOT NULL DEFAULT '{}'::jsonb,
    usage_limits  JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_settings_edition ON chat_settings (edition);