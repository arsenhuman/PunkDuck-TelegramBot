-- bot/migrations/006_faq_documents.sql
--
-- Migration 005: per-chat FAQ document for the @-mention Q&A feature.
-- One row per chat holding the raw text uploaded via /setfaq.
-- No versioning — a new upload overwrites the previous content.

CREATE TABLE IF NOT EXISTS faq_documents (
    chat_id     BIGINT PRIMARY KEY REFERENCES chats(chat_id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    updated_by  BIGINT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);