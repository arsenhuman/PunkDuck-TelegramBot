// editionPresets.js
//
// Defines the default feature/limits set for each bot "edition". A chat's
// resolved config = its edition preset, overridden by whatever is stored in
// chat_settings.features / chat_settings.usage_limits for that specific chat
// (usually empty — see resolveTenant.js for why that matters).
//
// Keep this file as the single source of truth for "what's on by default in
// each edition" — don't scatter that logic into individual feature files.
// User-facing wording/personality per edition+language lives separately in
// bot/src/i18n/locales/<edition>/<language>.json — this file only controls
// which features are on/off and their mechanical parameters.

const EDITION_PRESETS = {
    // Your DiliRock organizer chat. Full personality, no limits — internal
    // tool, not a paying customer. No FAQ (organizers don't need a FAQ bot
    // for themselves).
    dilirock: {
        language: 'ru',
        features: {
            cigarette: { enabled: true, chance: 1 / 50 },
            bully: { enabled: true, minInterval: 70, jitter: 15 },
            jokes: { enabled: true },
            memes: { enabled: true },
            summary: { enabled: true },
            faq: { enabled: false },
        },
        usageLimits: {
            summaryCallsPerDay: null, // null = unlimited
        },
    },

    // Public/general festival chat. Personality features stay on (jokes,
    // cigarette bit, roasting), but no /summary — public chats don't need a
    // digest of themselves. Instead: FAQ, answering attendee questions when
    // the bot is @-mentioned.
    general: {
        language: 'ru',
        features: {
            cigarette: { enabled: true, chance: 1 / 50 },
            bully: { enabled: true, minInterval: 70, jitter: 15 },
            jokes: { enabled: true },
            memes: { enabled: true },
            summary: { enabled: false },
            faq: { enabled: true },
        },
        usageLimits: {
            summaryCallsPerDay: null,
        },
    },

    // SaaS product — anyone adds the bot to their own chat. Personality
    // features off by default (not every chat wants a bot bumming
    // cigarettes); summary is the core paid feature, rate-limited on the
    // free tier. FAQ off by default too — it needs a per-tenant FAQ document
    // that doesn't exist yet (see features/faq.js TODO). Real plan
    // tiers/pricing come in the billing step.
    saas: {
        language: 'ru',
        features: {
            cigarette: { enabled: false },
            bully: { enabled: false },
            jokes: { enabled: true },
            memes: { enabled: false },
            summary: { enabled: true },
            faq: { enabled: false },
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