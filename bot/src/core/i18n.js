// i18n.js
//
// Resolves user-facing strings (t) and AI system prompts (getPrompt) for a
// given tenant, based on tenant.edition + tenant.language. Locale files live
// in bot/src/i18n/locales/<edition>/<language>.json.
//
// Falls back to general/ru if the exact edition+language file, or a specific
// key within it, is missing — so adding a new edition or language doesn't
// have to ship with every string translated on day one; it just silently
// borrows from general/ru until you fill it in.

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../i18n/locales');
const DEFAULT_LANGUAGE = 'ru';
const FALLBACK_EDITION = 'general';

const cache = new Map(); // "edition:language" -> parsed JSON or null

function loadLocale(edition, language) {
    const cacheKey = `${edition}:${language}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const filePath = path.join(LOCALES_DIR, edition, `${language}.json`);
    let data = null;
    if (fs.existsSync(filePath)) {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    cache.set(cacheKey, data);
    return data;
}

function resolveLocale(edition, language) {
    return (
        loadLocale(edition, language) ||
        loadLocale(edition, DEFAULT_LANGUAGE) ||
        loadLocale(FALLBACK_EDITION, language) ||
        loadLocale(FALLBACK_EDITION, DEFAULT_LANGUAGE)
    );
}

function interpolate(template, params) {
    if (typeof template !== 'string' || !params) return template;
    return template.replace(/\{(\w+)\}/g, (match, k) => (params[k] !== undefined ? params[k] : match));
}

function pickIfArray(value) {
    return Array.isArray(value) ? value[Math.floor(Math.random() * value.length)] : value;
}

/**
 * t(tenant, key, params?) — a user-facing string for tenant.edition/tenant.language.
 * If the value in the locale file is an array, one entry is picked at random
 * (used for things like summaryInProgress / bullyRandomPhrases variants).
 * Unresolvable keys return a visible "[[missing:key]]" marker instead of
 * throwing, so a typo doesn't crash the bot mid-conversation.
 */
function t(tenant, key, params) {
    const locale = resolveLocale(tenant.edition, tenant.language) || {};
    let value = locale[key];

    if (value === undefined) {
        const fallback = resolveLocale(FALLBACK_EDITION, DEFAULT_LANGUAGE) || {};
        value = fallback[key];
    }
    if (value === undefined) return `[[missing:${key}]]`;

    return interpolate(pickIfArray(value), params);
}

/** getPrompt(tenant, name) — an AI system prompt (bully / summary / faq / ...). */
function getPrompt(tenant, name) {
    const locale = resolveLocale(tenant.edition, tenant.language) || {};
    const fallback = resolveLocale(FALLBACK_EDITION, DEFAULT_LANGUAGE) || {};
    return locale.prompts?.[name] ?? fallback.prompts?.[name] ?? '';
}

module.exports = { t, getPrompt };