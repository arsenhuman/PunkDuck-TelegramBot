const db = require('../core/db');
const { t } = require('../core/i18n');
const { resolveTenant } = require('../core/resolveTenant');

const CALLBACK_PREFIX = 'give_beer';

async function requestBeer(ctx, tenant) {
    const sentMsg = await ctx.reply(t(tenant, 'beerRequest'), {
        reply_markup: {
            inline_keyboard: [
                [{ text: t(tenant, 'beerButtonLabel'), callback_data: CALLBACK_PREFIX }],
            ],
        },
    });

    await db.createBeerRequest({
        chatId: ctx.chat.id,
        botMsgId: sentMsg.message_id,
    });
}

async function handleBeerCallback(ctx) {
    const tenant = await resolveTenant(ctx.chat.id);

    const chatId = ctx.chat.id;
    const botMsgId = ctx.callbackQuery.message.message_id;
    const userId = ctx.from.id;
    const firstName = ctx.from.first_name || ctx.from.username || 'Someone';

    const won = await db.tryGiveBeer({ chatId, botMsgId, userId, firstName });

    if (!won) {
        await ctx.answerCbQuery(t(tenant, 'beerAlreadyGiven'));
        return;
    }

    await ctx.answerCbQuery();
    await ctx.editMessageText(t(tenant, 'beerGivenThanks', { firstName }));
}

function registerBeerHandlers(bot) {
    bot.action(CALLBACK_PREFIX, async (ctx) => {
        try {
            await handleBeerCallback(ctx);
        } catch (err) {
            console.error('[beer] Error handling button press:', err);
        }
    });
}

module.exports = { requestBeer, registerBeerHandlers };