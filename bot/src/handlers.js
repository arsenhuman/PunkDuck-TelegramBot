const db = require('./db');
const SETTINGS = require('../settings');

const { resolveTenant } = require('./resolveTenant');


const { getRandomJoke } = require('./jokes');
const { shouldRandomBully, randomBully, handleRoast, handleReply } = require('./bully');
const { getRandomMeme } = require('./media');


const { generateSummary } = require('./summarize');
const { BOT_MESSAGES } = require('./messages');
const { shouldRequestCigarette, requestCigarette, registerCigaretteHandlers } = require('./cigarette');
const { parse } = require('path');
 

const DEFAULT_PERIOD_HOURS = 24;



function registerHandlers(bot) {
    bot.on('message', async (ctx, next) => {

        if (ctx.message?.text?.startsWith('/')) return next();


        try {
            await logIncomingMessage(ctx);
        } catch (err) {
            console.error('[handlers] Не удалось сохранить сообщение:', err);
        }

        const isReplyToBot = ctx.message?.reply_to_message?.from?.id === ctx.botInfo.id;
        if (isReplyToBot) {
            try { await handleReply(ctx); } catch (err) {
                console.error('[handlers] ошибка reply:', err);
            }
            return next();
        }

        if (shouldRandomBully()) {
            try { await randomBully(ctx); } catch (err) {
                console.error('[handlers] ошибка random bully:', err);
            }
            return next();
        }

    
        if (shouldRequestCigarette()) {
            try {
                await requestCigarette(ctx);
            } catch (err) {
                console.error('[handlers] Не удалось отправить запрос на сигарету:', err);
            }
        }

        return next();
    });

    registerCigaretteHandlers(bot);

    bot.command('someshit', async (ctx) => {
    const meme = getRandomMeme();
    if (!meme) {
        await ctx.reply('мемов нет. как и смысла.');
        return;
    }
    await ctx.replyWithPhoto({ source: meme });
});

    bot.command('roast', async (ctx) => {
        try { await handleRoast(ctx); } catch (err) {
            console.error('[handlers] ошибка roast:', err);
            await ctx.reply('сломалось. не моя вина.');
        }
    });

    bot.command('summary', async (ctx) => {
        try {
            await handleSummaryCommand(ctx);
        } catch (err) {
            console.error('[handlers] Ошибка при генерации выжимки:', err);
            await ctx.reply(BOT_MESSAGES.summaryError());
        }
    });

    bot.command('joke', (ctx) => {
        ctx.reply(getRandomJoke());
    });

    bot.command('start', (ctx) => ctx.reply(BOT_MESSAGES.start()));
}

 
async function logIncomingMessage(ctx) {
    const msg = ctx.message;
    const chat = ctx.chat;
 
    await db.upsertChat({
        chatId: chat.id,
        title: chat.title || chat.username || `${chat.first_name || ''} ${chat.last_name || ''}`.trim(),
        chatType: chat.type,
    });
 
    await resolveTenant(chat.id);

    const { messageType, textContent } = extractContent(msg);
 
    await db.saveMessage({
        telegramMsgId: msg.message_id,
        chatId: chat.id,
        userId: msg.from?.id ?? null,
        username: msg.from?.username ?? null,
        firstName: msg.from?.first_name ?? null,
        messageType,
        textContent,
        replyToMsgId: msg.reply_to_message?.message_id ?? null,
        sentAt: new Date(msg.date * 1000),
    });
}
 

function extractContent(msg) {
    if (msg.text) return { messageType: 'text', textContent: msg.text };
    if (msg.photo) return { messageType: 'photo', textContent: msg.caption ?? null };
    if (msg.video) return { messageType: 'video', textContent: msg.caption ?? null };
    if (msg.voice) return { messageType: 'voice', textContent: msg.caption ?? null };
    if (msg.audio) return { messageType: 'audio', textContent: msg.caption ?? null };
    if (msg.document) return { messageType: 'document', textContent: msg.caption ?? msg.document.file_name ?? null };
    if (msg.sticker) return { messageType: 'sticker', textContent: msg.sticker.emoji ?? null };
    if (msg.poll) return { messageType: 'poll', textContent: msg.poll.question ?? null };
    if (msg.location) return { messageType: 'location', textContent: null };
    if (msg.video_note) return { messageType: 'video_note', textContent: null };
    return { messageType: 'other', textContent: null };
}
 
async function handleSummaryCommand(ctx) {
    const chatId = ctx.chat.id;
    const periodArg = ctx.message.text.split(' ')[1]; // например "/summary 6h" -> "6h"

    const { periodStart, isCheckpoint } = await resolvePeriodStart(chatId, periodArg);
    const periodEnd = new Date();

    await ctx.reply(BOT_MESSAGES.summaryInProgress());

    const messages = await db.getMessagesSince(chatId, periodStart);
    const { summaryText, modelUsed, messagesUsed } = await generateSummary(messages);

    await db.saveSummary({
        chatId,
        requestedBy: ctx.from?.id ?? null,
        periodStart,
        periodEnd,
        messageCount: messagesUsed,
        summaryText,
        modelUsed,
        isCheckpoint,
    });

    const periodLabel = formatPeriodLabel(periodStart, periodEnd);
    await ctx.reply(
        BOT_MESSAGES.summaryResult({ periodLabel, messageCount: messages.length, summaryText }),
        {
            reply_to_message_id: ctx.message.message_id,
            parse_mode: 'Markdown'
        }
    );
}
 
/**
 * Определяет начало периода для выжимки:
 * - "/summary 6h" / "/summary 3d" — явный период
 * - "/summary" без аргумента — с момента последней выжимки, либо DEFAULT_PERIOD_HOURS, если выжимок ещё не было
 */
async function resolvePeriodStart(chatId, periodArg) {
    if (periodArg) {
        const parsed = parsePeriodArg(periodArg);
        if (parsed) return { periodStart: new Date(Date.now() - parsed), isCheckpoint: false };
    }

    const lastSummaryTime = await db.getLastSummaryTime(chatId);
    if (lastSummaryTime) return { periodStart: lastSummaryTime, isCheckpoint: true };

    return { periodStart: new Date(Date.now() - DEFAULT_PERIOD_HOURS * 60 * 60 * 1000), isCheckpoint: true };
}
 
/**
 * Парсит строки вида "6h", "3d", "30m" в миллисекунды. Возвращает null, если формат не распознан.
 */
function parsePeriodArg(arg) {
    const match = /^(\d+)([hdm])?$/.exec(arg.trim().toLowerCase());
    if (!match) return null;
 
    const value = Number(match[1]);
    const unit = match[2];
    const unitMs = { m: 60_000, h: 3_600_000, d: 86_400_000 };
    return value * unitMs[unit];
}
 
function formatPeriodLabel(start, end) {
    const fmt = (d) => d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `с ${fmt(start)} по ${fmt(end)}`;
}
 
module.exports = { registerHandlers };
 