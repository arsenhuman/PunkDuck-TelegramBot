// commandFeatureRegistry.js
//
// Declares independent slash-command features as { command, feature, handler }.
// handlers.js registers all of them in one loop, resolves the tenant once,
// checks featureGate, and passes (ctx, tenant) into the handler — so handlers
// can localize their replies via core/i18n without re-resolving the tenant.
//
// NOT listed here on purpose:
//   - cigarette / bully(random) / reply-to-bot / faq — these are message-driven,
//     not slash commands, gated inline in handlers.js instead.
//   - summary — needs a usage-limit check (checkUsageLimit), not just
//     enabled/disabled, so it stays as its own bot.command() for now.
//   - start — always available, not a gated feature.

const { getRandomJoke } = require('./features/jokes');
const { getRandomMeme } = require('./features/memes');
const { handleRoast } = require('./features/bully');
const { t } = require('./core/i18n');

const COMMAND_FEATURES = [
    {
        command: 'joke',
        feature: 'jokes',
        handler: (ctx) => ctx.reply(getRandomJoke()),
    },
    {
        command: 'someshit',
        feature: 'memes',
        handler: async (ctx, tenant) => {
            const meme = getRandomMeme();
            if (!meme) {
                await ctx.reply(t(tenant, 'memesEmpty'));
                return;
            }
            await ctx.replyWithPhoto({ source: meme });
        },
    },
    {
        command: 'roast',
        feature: 'bully',
        handler: (ctx, tenant) => handleRoast(ctx, tenant),
    },
];

module.exports = { COMMAND_FEATURES };