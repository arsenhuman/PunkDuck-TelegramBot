// cigarette.js — feature character: the bot randomly "bums" a cigarette in the chat.
//
// Mechanics:
// 1. For every regular message in the chat, we roll the dice with a CIGARETTE_CHANCE probability.
// 2. If it triggers, the bot sends a message with an inline "Give a cigarette" button.
// 3. The first user to press the button "wins" — the button becomes unavailable for everyone else
//    (enforced at the database level via UPDATE ... WHERE given_by_user_id IS NULL).

const db = require('./db');
const { BOT_MESSAGES } = require('./messages');

// 1 in 100 chance for every regular message in the chat.
const CIGARETTE_CHANCE = 1 / 20;

// Unique callback_data prefix used to distinguish this button from
// any other inline buttons the bot may have in the future.
const CALLBACK_PREFIX = 'give_cigarette';

/**
 * Determines whether the bot should ask for a cigarette now.
 * Called for every regular message from the main message handler.
 */
function shouldRequestCigarette() {
    return Math.random() < CIGARETTE_CHANCE;
}

/**
 * Sends the request message with a button and stores the event in the database.
 */
async function requestCigarette(ctx) {
    const sentMsg = await ctx.reply(BOT_MESSAGES.cigaretteRequest(), {
        reply_markup: {
            inline_keyboard: [
                [{ text: BOT_MESSAGES.cigaretteButtonLabel(), callback_data: CALLBACK_PREFIX }],
            ],
        },
    });

    await db.createCigaretteRequest({
        chatId: ctx.chat.id,
        botMsgId: sentMsg.message_id,
    });
}

/**
 * Handles presses on the "Give a cigarette" button.
 */
async function handleCigaretteCallback(ctx) {
    const chatId = ctx.chat.id;
    const botMsgId = ctx.callbackQuery.message.message_id;
    const userId = ctx.from.id;
    const firstName = ctx.from.first_name || ctx.from.username || 'Someone';

    const won = await db.tryGiveCigarette({ chatId, botMsgId, userId, firstName });

    if (!won) {
        // Someone else got there first — quietly notify the user
        // with a Telegram popup instead of sending a new chat message.
        await ctx.answerCbQuery(BOT_MESSAGES.cigaretteAlreadyGiven());
        return;
    }

    await ctx.answerCbQuery();

    // Remove the button and replace the text with a thank-you message
    // so it's clear that the giveaway is over.
    await ctx.editMessageText(BOT_MESSAGES.cigaretteGivenThanks({ firstName }));
}

/**
 * Registers the callback handler on the bot instance.
 * Called once during startup, similar to registerHandlers in handlers.js.
 */
function registerCigaretteHandlers(bot) {
    bot.action(CALLBACK_PREFIX, async (ctx) => {
        try {
            await handleCigaretteCallback(ctx);
        } catch (err) {
            console.error('[cigarette] Error handling button press:', err);
        }
    });
}

module.exports = { shouldRequestCigarette, requestCigarette, registerCigaretteHandlers };