// editionPresets.js
//
// Defines the default feature/limits set for each bot "edition". A chat's
// resolved config = its edition preset, overridden by whatever is stored in
// chat_settings.features / chat_settings.usage_limits for that specific chat.
//
// Keep this file as the single source of truth for "what's on by default in
// each edition" — don't scatter that logic into individual feature files.

const EDITION_PRESETS = {
    // Your DiliRock organizer chat. Full personality, no limits — this is an
    // internal tool, not a paying customer.
    dilirock: {
        language: 'ru',
        features: {
            cigarette: { enabled: true, chance: 1 / 50 },
            bully: { enabled: true, minInterval: 70, jitter: 15 },
            jokes: { enabled: true },
            memes: { enabled: true },
            summary: { enabled: true },
        },
        usageLimits: {
            summaryCallsPerDay: null, // null = unlimited
        },
    },

    // Placeholder for a general-audience version of the same bot (not tied to
    // festival organizing specifically). Currently identical to dilirock;
    // differentiate here once you build out i18n / personality variants.
    general: {
        language: 'ru',
        features: {
            cigarette: { enabled: true, chance: 1 / 50 },
            bully: { enabled: true, minInterval: 70, jitter: 15 },
            jokes: { enabled: true },
            memes: { enabled: true },
            summary: { enabled: true },
        },
        usageLimits: {
            summaryCallsPerDay: null,
        },
    },

    // Placeholder for the SaaS product — anyone can add the bot to their chat.
    // Personality features off by default (not every chat wants a bot asking
    // for cigarettes); summary is the core paid feature, rate-limited on the
    // free tier. Real plan tiers/pricing come in the billing step.
    saas: {
        language: 'ru',
        features: {
            cigarette: { enabled: false },
            bully: { enabled: false },
            jokes: { enabled: true },
            memes: { enabled: false },
            summary: { enabled: true },
        },
        usageLimits: {
            summaryCallsPerDay: 5,
        },
    },
};

// Edition assigned to a brand-new, never-seen-before chat. "general" is the
// safe default for the SaaS-facing future — your DiliRock chat gets flagged
// explicitly via a one-time UPDATE after the migration runs.
const DEFAULT_EDITION = 'general';

module.exports = { EDITION_PRESETS, DEFAULT_EDITION };