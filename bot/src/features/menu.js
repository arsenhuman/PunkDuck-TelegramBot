// menu.js — in-chat /settings menu (inline keyboard).
//
// Everything here is a thin UI layer over tenantSettings.updateTenantSettings:
// each action reads the current resolved tenant, patches ONE feature's
// object (spreading its current value first — chat_settings.features does a
// shallow JSONB merge at the top level, so omitting existing keys would
// silently drop them), invalidates the cache, re-resolves, and re-renders.
//
// intensity is the one exception — it's a plain column on chat_settings
// (chat-level trait, not tied to any one feature), so it's set directly via
// { intensity: level } rather than nested inside a features.* patch.
//
// The frequency menu's "off" button and the features menu's toggle button
// both write the SAME field (features.<name>.enabled) — there's no separate
// on/off flag for "frequency-off" vs "feature disabled". Turning a feature
// off from either menu is reflected in both.

const { t } = require('../core/i18n');
const { resolveTenant, invalidateTenantCache } = require('../core/resolveTenant');
const { updateTenantSettings } = require('../core/tenantSettings');
const { isChatAdmin } = require('../utils/adminCheck');

const TOGGLEABLE_FEATURES = ['cigarette', 'bully', 'jokes', 'memes', 'summary', 'faq', 'autoSummary'];

const CIGARETTE_FREQUENCY_PRESETS = {
    rare: { chance: 1 / 250 },
    medium: { chance: 1 / 100 },
    often: { chance: 1 / 20 },
};

const BULLY_FREQUENCY_PRESETS = {
    rare: { minInterval: 150, jitter: 30 },
    medium: { minInterval: 70, jitter: 15 },
    often: { minInterval: 30, jitter: 10 },
};

const AUTO_SUMMARY_FREQUENCY_PRESETS = {
    rare:   { intervalMinutes: 10080 }, // once per week
    medium: { intervalMinutes: 4320 }, // once every 3 days
    often:  { intervalMinutes: 1440 }, // once per day
};

const DEFAULT_FREQUENCY_LABEL_KEYS = {
    rare: 'freqRare',
    medium: 'freqMedium',
    often: 'freqOften',
};

// target -> { presets, presetKey, labelKey } — drives buildFrequencySection
// generically so cigarette/bully render identically instead of one being
// hand-special-cased (that mismatch is what caused the original bug).
const FREQUENCY_SECTIONS = {
    cigarette: { presets: CIGARETTE_FREQUENCY_PRESETS, presetKey: 'chance', labelKey: 'settingsFrequencyCigaretteLabel' },
    bully: { presets: BULLY_FREQUENCY_PRESETS, presetKey: 'minInterval', labelKey: 'settingsFrequencyBullyLabel' },
    autoSummary: {
        presets: AUTO_SUMMARY_FREQUENCY_PRESETS,
        presetKey: 'intervalMinutes',
        labelKey: 'settingsFrequencyAutoSummaryLabel',
        frequencyLabelKeys: {
            rare: 'autoSummaryFreqWeekly',
            medium: 'autoSummaryFreqEvery3Days',
            often: 'autoSummaryFreqDaily',
        },
    },
};

function frequencyLevel(presets, config, key) {
    for (const [level, preset] of Object.entries(presets)) {
        if (preset[key] === config?.[key]) return level;
    }
    return null;
}

function buildMainMenu(tenant) {
    return {
        text: t(tenant, 'settingsMenuTitle'),
        keyboard: [
            [{ text: t(tenant, 'settingsLanguageButton'), callback_data: 'st:menu:lang' }],
            [{ text: t(tenant, 'settingsIntensityButton'), callback_data: 'st:menu:intensity' }],
            [{ text: t(tenant, 'settingsFeaturesButton'), callback_data: 'st:menu:features' }],
            [{ text: t(tenant, 'settingsFrequencyButton'), callback_data: 'st:menu:frequency' }],
        ],
    };
}

function buildLanguageMenu(tenant) {
    const mark = (lang) => (tenant.language === lang ? '✅ ' : '');
    return {
        text: t(tenant, 'settingsLanguageTitle'),
        keyboard: [
            [{ text: `${mark('ru')}Russian`, callback_data: 'st:lang:ru' }],
            [{ text: `${mark('en')}English`, callback_data: 'st:lang:en' }],
            [{ text: t(tenant, 'settingsBackButton'), callback_data: 'st:menu:main' }],
        ],
    };
}

function buildIntensityMenu(tenant) {
    const current = tenant.intensity;
    const mark = (level) => (current === level ? '✅ ' : '');
    return {
        text: t(tenant, 'settingsIntensityTitle'),
        keyboard: [
            [{ text: `${mark('soft')}${t(tenant, 'intensitySoft')}`, callback_data: 'st:intensity:soft' }],
            [{ text: `${mark('medium')}${t(tenant, 'intensityMedium')}`, callback_data: 'st:intensity:medium' }],
            [{ text: `${mark('hard')}${t(tenant, 'intensityHard')}`, callback_data: 'st:intensity:hard' }],
            [{ text: t(tenant, 'settingsBackButton'), callback_data: 'st:menu:main' }],
        ],
    };
}

function buildFeaturesMenu(tenant) {
    const rows = TOGGLEABLE_FEATURES.map((feature) => {
        const enabled = Boolean(tenant.features[feature]?.enabled);
        const mark = enabled ? '✅' : '❌';
        return [{ text: `${mark} ${t(tenant, `featureName_${feature}`)}`, callback_data: `st:toggle:${feature}` }];
    });
    if (tenant.features.autoSummary?.enabled) {
        rows.push([{
            text: tenant.autoSummaryThreadId
                ? t(tenant, 'autoSummaryThreadStatusSet')
                : t(tenant, 'autoSummaryThreadStatusDefault'),
            callback_data: 'noop',
        }]);
    }
    rows.push([{ text: t(tenant, 'settingsBackButton'), callback_data: 'st:menu:main' }]);
    return { text: t(tenant, 'settingsFeaturesTitle'), keyboard: rows };
}

/**
 * One section (header + rate buttons + off button) for a single frequency
 * target ('cigarette' or 'bully'). Both targets go through this exact same
 * builder now, so they can't visually drift apart again.
 */
function buildFrequencySection(tenant, target) {
    const { presets, presetKey, labelKey, frequencyLabelKeys = DEFAULT_FREQUENCY_LABEL_KEYS } = FREQUENCY_SECTIONS[target];
    const enabled = Boolean(tenant.features[target]?.enabled);
    const currentLevel = enabled ? frequencyLevel(presets, tenant.features[target], presetKey) : null;
    const mark = (level) => (currentLevel === level ? '✅ ' : '');
    const offMark = !enabled ? '✅ ' : '';

    return [
        [{ text: t(tenant, labelKey), callback_data: 'noop' }],
        [
            { text: `${mark('rare')}${t(tenant, frequencyLabelKeys.rare)}`, callback_data: `st:freq:${target}:rare` },
            { text: `${mark('medium')}${t(tenant, frequencyLabelKeys.medium)}`, callback_data: `st:freq:${target}:medium` },
            { text: `${mark('often')}${t(tenant, frequencyLabelKeys.often)}`, callback_data: `st:freq:${target}:often` },
        ],
        [{ text: `${offMark}🚫 ${t(tenant, 'freqOff')}`, callback_data: `st:freq:${target}:off` }],
    ];
}

function buildFrequencyMenu(tenant) {
    return {
        text: t(tenant, 'settingsFrequencyTitle'),
        keyboard: [
            ...buildFrequencySection(tenant, 'cigarette'),
            ...buildFrequencySection(tenant, 'bully'),
            ...buildFrequencySection(tenant, 'autoSummary'),

            [{ text: t(tenant, 'settingsBackButton'), callback_data: 'st:menu:main' }],
        ],
    };
}

const MENU_BUILDERS = {
    main: buildMainMenu,
    lang: buildLanguageMenu,
    intensity: buildIntensityMenu,
    features: buildFeaturesMenu,
    frequency: buildFrequencyMenu,
};

async function renderMenu(ctx, tenant, menu) {
    const options = { reply_markup: { inline_keyboard: menu.keyboard } };
    if (ctx.callbackQuery) {
        await ctx.editMessageText(menu.text, options);
    } else {
        await ctx.reply(menu.text, options);
    }
}

async function handleSettingsCommand(ctx, tenant) {
    await renderMenu(ctx, tenant, buildMainMenu(tenant));
}

async function handleSettingsCallback(ctx) {
    const chatId = ctx.chat.id;
    const tenant = await resolveTenant(chatId);

    if (!(await isChatAdmin(ctx))) {
        await ctx.answerCbQuery(t(tenant, 'settingsNotAdmin'), { show_alert: true });
        return;
    }

    const [, action, ...rest] = ctx.callbackQuery.data.split(':'); // "st:lang:ru" -> action="lang", rest=["ru"]

    if (action === 'menu') {
        const [target] = rest;
        await ctx.answerCbQuery();
        await renderMenu(ctx, tenant, MENU_BUILDERS[target](tenant));
        return;
    }

    if (action === 'lang') {
        const [lang] = rest;
        await updateTenantSettings(chatId, { language: lang });
        invalidateTenantCache(chatId);
        const updated = await resolveTenant(chatId);
        await ctx.answerCbQuery(t(updated, 'settingsSaved'));
        await renderMenu(ctx, updated, buildLanguageMenu(updated));
        return;
    }

    if (action === 'intensity') {
        const [level] = rest;
        await updateTenantSettings(chatId, { intensity: level });
        invalidateTenantCache(chatId);
        const updated = await resolveTenant(chatId);
        await ctx.answerCbQuery(t(updated, 'settingsSaved'));
        await renderMenu(ctx, updated, buildIntensityMenu(updated));
        return;
    }

    if (action === 'toggle') {
        const [feature] = rest;
        const enabled = !tenant.features[feature]?.enabled;
        await updateTenantSettings(chatId, { features: { [feature]: { ...tenant.features[feature], enabled } } });
        invalidateTenantCache(chatId);
        const updated = await resolveTenant(chatId);
        await ctx.answerCbQuery(t(updated, 'settingsSaved'));
        await renderMenu(ctx, updated, buildFeaturesMenu(updated));
        return;
    }

    if (action === 'freq') {
        const [target, level] = rest; // target: 'cigarette' | 'bully'; level: 'rare'|'medium'|'often'|'off'
        const { presets } = FREQUENCY_SECTIONS[target] ?? {};
        if (!presets) { await ctx.answerCbQuery(); return; }

        // Picking a rate implies "and turn it on" — otherwise choosing
        // "often" while the feature is off would silently do nothing.
        // Picking "off" only flips enabled, keeping the last chosen rate
        // untouched so it's remembered for next time it's turned back on.
        const patch = level === 'off'
            ? { enabled: false }
            : presets[level] ? { ...presets[level], enabled: true } : null;

        if (!patch) { await ctx.answerCbQuery(); return; }

        await updateTenantSettings(chatId, { features: { [target]: { ...tenant.features[target], ...patch } } });
        invalidateTenantCache(chatId);
        const updated = await resolveTenant(chatId);
        await ctx.answerCbQuery(t(updated, 'settingsSaved'));
        await renderMenu(ctx, updated, buildFrequencyMenu(updated));
        return;
    }

    await ctx.answerCbQuery();
}

function registerSettingsHandlers(bot) {
    bot.action(/^st:/, async (ctx) => {
        try {
            await handleSettingsCallback(ctx);
        } catch (err) {
            console.error('[settings] Error handling callback:', err);
            await ctx.answerCbQuery().catch(() => {});
        }
    });
    bot.action('noop', (ctx) => ctx.answerCbQuery());
}

module.exports = { handleSettingsCommand, registerSettingsHandlers };
