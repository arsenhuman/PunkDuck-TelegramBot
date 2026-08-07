// settings.js — in-chat /settings menu (inline keyboard).
//
// Everything here is a thin UI layer over tenantSettings.updateTenantSettings:
// each action reads the current resolved tenant, patches ONE feature's
// object (spreading its current value first — chat_settings.features does a
// shallow JSONB merge at the top level, so omitting existing keys would
// silently drop them), invalidates the cache, re-resolves, and re-renders.

const { t } = require('../core/i18n');
const { resolveTenant, invalidateTenantCache } = require('../core/resolveTenant');
const { updateTenantSettings } = require('../core/tenantSettings');
const { isChatAdmin } = require('../core/adminCheck');

const TOGGLEABLE_FEATURES = ['cigarette', 'bully', 'jokes', 'memes', 'summary', 'faq'];

const CIGARETTE_FREQUENCY_PRESETS = {
    rare: { chance: 1 / 100 },
    medium: { chance: 1 / 50 },
    often: { chance: 1 / 20 },
};

const BULLY_FREQUENCY_PRESETS = {
    rare: { minInterval: 150, jitter: 30 },
    medium: { minInterval: 70, jitter: 15 },
    often: { minInterval: 30, jitter: 10 },
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
            [{ text: `${mark('ru')}Русский`, callback_data: 'st:lang:ru' }],
            [{ text: `${mark('en')}English`, callback_data: 'st:lang:en' }],
            [{ text: t(tenant, 'settingsBackButton'), callback_data: 'st:menu:main' }],
        ],
    };
}

function buildIntensityMenu(tenant) {
    const current = tenant.features.bully?.intensity ?? 'medium';
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
    rows.push([{ text: t(tenant, 'settingsBackButton'), callback_data: 'st:menu:main' }]);
    return { text: t(tenant, 'settingsFeaturesTitle'), keyboard: rows };
}

function buildFrequencyMenu(tenant) {
    const cigLevel = frequencyLevel(CIGARETTE_FREQUENCY_PRESETS, tenant.features.cigarette, 'chance');
    const bullyLevel = frequencyLevel(BULLY_FREQUENCY_PRESETS, tenant.features.bully, 'minInterval');
    const markCig = (l) => (cigLevel === l ? '✅ ' : '');
    const markBully = (l) => (bullyLevel === l ? '✅ ' : '');

    return {
        text:
            `${t(tenant, 'settingsFrequencyTitle')}\n\n` +
            `${t(tenant, 'settingsFrequencyCigaretteLabel')}`,
        keyboard: [
            [
                { text: `${markCig('rare')}${t(tenant, 'freqRare')}`, callback_data: 'st:freq:cigarette:rare' },
                { text: `${markCig('medium')}${t(tenant, 'freqMedium')}`, callback_data: 'st:freq:cigarette:medium' },
                { text: `${markCig('often')}${t(tenant, 'freqOften')}`, callback_data: 'st:freq:cigarette:often' },
            ],
            [{ text: t(tenant, 'settingsFrequencyBullyLabel'), callback_data: 'noop' }],
            [
                { text: `${markBully('rare')}${t(tenant, 'freqRare')}`, callback_data: 'st:freq:bully:rare' },
                { text: `${markBully('medium')}${t(tenant, 'freqMedium')}`, callback_data: 'st:freq:bully:medium' },
                { text: `${markBully('often')}${t(tenant, 'freqOften')}`, callback_data: 'st:freq:bully:often' },
            ],
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
        await updateTenantSettings(chatId, { features: { bully: { ...tenant.features.bully, intensity: level } } });
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
        const [target, level] = rest; // target: 'cigarette' | 'bully'
        const presets = target === 'cigarette' ? CIGARETTE_FREQUENCY_PRESETS : BULLY_FREQUENCY_PRESETS;
        const patch = presets[level];
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
            console.error('[settings] ошибка обработки колбэка:', err);
            await ctx.answerCbQuery().catch(() => {});
        }
    });
    bot.action('noop', (ctx) => ctx.answerCbQuery());
}

module.exports = { handleSettingsCommand, registerSettingsHandlers };