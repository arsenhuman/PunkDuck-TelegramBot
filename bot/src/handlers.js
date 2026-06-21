const db = require('./db');
const SETTINGS = require('../settings');

const { generateSummary } = require('./summarize');
const { BOT_MESSAGES } = require('./messages');
const { shouldRequestCigarette, requestCigarette, registerCigaretteHandlers } = require('./cigarette');
 

const DEFAULT_PERIOD_HOURS = 24;



function registerHandlers(bot) {
    // Логируем КАЖДОЕ сообщение в чате (требует выключенного privacy mode у бота).
    bot.on('message', async (ctx, next) => {
        try {
            await logIncomingMessage(ctx);
        } catch (err) {
            console.error('[handlers] Не удалось сохранить сообщение:', err);
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
 
    bot.command('summary', async (ctx) => {
        try {
            await handleSummaryCommand(ctx);
        } catch (err) {
            console.error('[handlers] Ошибка при генерации выжимки:', err);
            await ctx.reply(BOT_MESSAGES.summaryError());
        }
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
 
/**
 * Определяет тип сообщения и достаёт текст/caption — единообразно для текстов и вложений.
 */
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
 
    const periodStart = await resolvePeriodStart(chatId, periodArg);
    const periodEnd = new Date();
 
    await ctx.reply('Собираю выжимку, секунду…');
 
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
    });
 
    const periodLabel = formatPeriodLabel(periodStart, periodEnd);
    await ctx.reply(`📋 Выжимка ${periodLabel} (${messages.length} сообщ.):\n\n${summaryText}`, {
        reply_to_message_id: ctx.message.message_id,
    });
}
 
async function resolvePeriodStart(chatId, periodArg) {
    if (periodArg) {
        const parsed = parsePeriodArg(periodArg);
        if (parsed) return new Date(Date.now() - parsed);
    }
 
    const lastSummaryTime = await db.getLastSummaryTime(chatId);
    if (lastSummaryTime) return lastSummaryTime;
 
    return new Date(Date.now() - DEFAULT_PERIOD_HOURS * 60 * 60 * 1000);
}
 
function parsePeriodArg(arg) {
    const match = /^(\d+)([hdm])$/.exec(arg.trim().toLowerCase());
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
 
