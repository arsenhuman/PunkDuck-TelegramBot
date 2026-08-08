-- 007_fix_intensity_column.sql
--
-- Migration 005 added chat_settings.intensity but it was never wired into
-- the app — the /settings menu ended up storing intensity inside
-- chat_settings.features.bully.intensity (JSONB) instead, using different
-- level names ('soft'/'medium'/'hard') than the column's original comment
-- ('soft'/'normal'/'toxic'). This migration:
--   1. Fixes the column default to match the values actually in use.
--   2. Migrates any intensity value chats already set via the old (broken)
--      menu path out of features.bully.intensity into the proper column.
--   3. Normalizes any stray/old value to 'medium'.
--   4. Removes the now-redundant intensity key from features.bully so
--      there's a single source of truth going forward.

ALTER TABLE chat_settings ALTER COLUMN intensity SET DEFAULT 'medium';

UPDATE chat_settings
SET intensity = features->'bully'->>'intensity'
WHERE features->'bully'->>'intensity' IS NOT NULL;

UPDATE chat_settings
SET intensity = 'medium'
WHERE intensity NOT IN ('soft', 'medium', 'hard');

UPDATE chat_settings
SET features = jsonb_set(features, '{bully}', (features->'bully') - 'intensity')
WHERE features->'bully' ? 'intensity';