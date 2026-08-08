const { t } = require('../core/i18n');

// command -> { feature, key } — feature: null значит "показывать всегда"
// (не привязано к тогглу конкретной фичи). key — строка в i18n с описанием.
const HELP_ENTRIES = [
    { feature: null,         key: 'helpSummaryDefault' },     // /summary
    { feature: 'jokes',      key: 'helpJoke' },                // /joke
    { feature: 'memes',      key: 'helpMemes' },                // /someshit
    { feature: 'bully',      key: 'helpRoast' },                // /roast
    { feature: 'gpt',        key: 'helpGpt' },                  // /gpt
    { feature: 'faq',        key: 'helpSetFaq' },               // /setfaq
    { feature: 'autoSummary',key: 'helpSetSummaryThread' },     // /setsummarythread
    { feature: null,         key: 'helpSettings' },             // /settings
];

function buildHelpText(tenant) {
    const lines = HELP_ENTRIES
        .filter(({ feature }) => feature === null || tenant.features[feature]?.enabled)
        .map(({ key }) => t(tenant, key));

    return [t(tenant, 'helpIntro'), ...lines].join('\n');
}

module.exports = { buildHelpText };