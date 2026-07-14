// resolveTenant.js
//
// The single entrypoint the rest of the bot should use to answer "what should
// this chat be doing?". Auto-creates a chat_settings row (edition='general')
// on first contact, merges the edition preset with any per-chat overrides,
// and caches the result briefly to avoid a DB round-trip on every message.

const { EDITION_PRESETS, DEFAULT_EDITION } = require('./editionPresets');
const { getTenantRow, insertTenantDefaults } = require('./tenantSettings');

// In-memory cache: chatId -> { value, expiresAt }. TTL keeps behavior correct
// if settings are changed elsewhere (future /setup command, admin panel, etc.)
// without needing an explicit cache-invalidation call in most cases.
const CACHE_TTL_MS = 60_000;
const cache = new Map();

function mergeFeatures(presetFeatures, overrideFeatures) {
    const merged = {};
    for (const key of Object.keys(presetFeatures)) {
        merged[key] = { ...presetFeatures[key], ...(overrideFeatures?.[key] ?? {}) };
    }
    // Allow a per-chat override to introduce a feature key the preset doesn't
    // define at all (e.g. enabling something experimental for one chat only).
    for (const key of Object.keys(overrideFeatures ?? {})) {
        if (!merged[key]) merged[key] = overrideFeatures[key];
    }
    return merged;
}

/**
 * Returns the resolved config for a chat:
 *   { chatId, edition, plan, language, features, usageLimits }
 *
 * `features` and `usageLimits` are always fully populated (preset + overrides
 * merged), so callers never need to know about presets themselves.
 */
async function resolveTenant(chatId) {
    const cached = cache.get(chatId);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    let row = await getTenantRow(chatId);

    if (!row) {
        const preset = EDITION_PRESETS[DEFAULT_EDITION];
        row = await insertTenantDefaults({
            chatId,
            edition: DEFAULT_EDITION,
            language: preset.language,
            features: preset.features,
            usageLimits: preset.usageLimits,
        });
        // Lost a race with a concurrent insert for the same chat — just re-read.
        if (!row) row = await getTenantRow(chatId);
    }

    const preset = EDITION_PRESETS[row.edition] ?? EDITION_PRESETS[DEFAULT_EDITION];

    const resolved = {
        chatId: row.chat_id,
        edition: row.edition,
        plan: row.plan,
        language: row.language,
        features: mergeFeatures(preset.features, row.features),
        usageLimits: { ...preset.usageLimits, ...row.usage_limits },
    };

    cache.set(chatId, { value: resolved, expiresAt: Date.now() + CACHE_TTL_MS });
    return resolved;
}

/** Call after an admin-driven settings change so the next read isn't stale. */
function invalidateTenantCache(chatId) {
    cache.delete(chatId);
}

module.exports = { resolveTenant, invalidateTenantCache };