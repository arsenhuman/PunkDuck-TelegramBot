// featureGate.js
//
// Central place to answer "is feature X allowed to run for this chat right now?"
// Everything else (handlers.js, command registry) calls into here instead of
// reading chat_settings/editionPresets directly.

const { resolveTenant } = require('./resolveTenant');

/**
 * true/false — is this feature turned on for this chat's resolved config.
 * Does NOT check usage limits; use checkUsageLimit for metered features.
 */
async function isFeatureEnabled(chatId, featureName) {
    const tenant = await resolveTenant(chatId);
    return Boolean(tenant.features?.[featureName]?.enabled);
}

/**
 * Full feature config object (e.g. { enabled: true, chance: 0.02 }), for
 * callers that need parameters, not just an on/off flag.
 */
async function getFeatureConfig(chatId, featureName) {
    const tenant = await resolveTenant(chatId);
    return tenant.features?.[featureName] ?? { enabled: false };
}

/**
 * Stub — real usage counting (querying today's summary count from DB) gets
 * wired up in the billing step. For now: if no limit is configured for this
 * chat (null/undefined), it's unlimited. If a limit *is* configured, this
 * currently still allows the call — TODO once billing lands.
 */
async function checkUsageLimit(chatId, limitKey) {
    const tenant = await resolveTenant(chatId);
    const limit = tenant.usageLimits?.[limitKey];
    if (limit === null || limit === undefined) return { allowed: true, limit: null };
    // TODO(billing step): actual usage today and compare against `limit`.
    return { allowed: true, limit };
}

module.exports = { isFeatureEnabled, getFeatureConfig, checkUsageLimit };