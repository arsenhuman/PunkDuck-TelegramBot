// commandFeatures.js
//
// Declares independent slash-command features as { command, feature, handler }.
// handlers.js registers all of them in one loop and checks featureGate before
// running the handler — enabling/disabling one of these for a chat is purely a
// chat_settings.features change now, no code edit needed.
//
// NOT listed here on purpose:
//   - cigarette / bully(random)/ reply-to-bot — these are message-driven and
//     mutually exclusive per message, gated inline in handlers.js instead.
//   - summary — needs a usage-limit check (checkUsageLimit), not just
//     enabled/disabled, so it stays as its own bot.command() for now.
//   - start — always available, not a gated feature.

const { getRandomJoke } = require('./jokes');
const { getRandomMeme } = require('./media');
const { handleRoast } = require('./bully');

const COMMAND_FEATURES = [
    {
        command: 'joke',
        feature: 'jokes',
        handler: (ctx) => ctx.reply(getRandomJoke()),
    },
    {
        command: 'someshit',
        feature: 'memes',
        handler: async (ctx) => {
            const meme = getRandomMeme();
            if (!meme) {
                await ctx.reply('мемов нет. как и смысла.');
                return;
            }
            await ctx.replyWithPhoto({ source: meme });
        },
    },
    {
        command: 'roast',
        feature: 'bully',
        handler: (ctx) => handleRoast(ctx),
    },
];

module.exports = { COMMAND_FEATURES };