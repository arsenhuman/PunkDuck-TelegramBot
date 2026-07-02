-- Migration 004: Per-chat feature toggles.
-- Allows enabling/disabling features (bully, cigarette, jokes, someshit)
-- for each chat independently, so different groups can have different
-- sets of features enabled in the same deployment.

ALTER TABLE chats ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;