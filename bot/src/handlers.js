const db = require('./core/db');
const SETTINGS = require('../settings');

const { shouldRandomBully, randomBully, handleReply } = require('./features/bully');
const { generateSummary } = require('./features/summary');
const { requestCigarette, registerCigaretteHandlers } = require('./features/cigarette');
const { handleFaqMention } = require('./features/faq');
const { resolveTenant } = require('./core/resolveTenant');
const { checkUsageLimit } = require('./core/featureGate');
const { t } = require('./core/i18n');
const { COMMAND_FEATURES } = require('./commandFeatureRegistry');

const DEFAULT_PERIOD_HOURS = 24;

function registerHandlers(bot) {
    bot.on('message', async (ctx, next) => {

        if (ctx.message?.text?.startsWith('/')) return next();

        try {
            await logIncomingMessage(ctx);
        } catch (err) {
            console.error('[handlers] Не удалось сохранить сообщение:', err);
        }

        const tenant = await resolveTenant(ctx.chat.id); // cached — cheap to call per message

        // reply-to-bot / random-bully / cigarette are mutually exclusive per
        // message (only one fires) — kept as an explicit priority chain
        // rather than a generic feature loop, since that mutual exclusivity
        // doesn't fit "run every enabled feature".

        const isReplyToBot = ctx.message?.reply_to_message?.from?.id === ctx.botInfo.id;

        if (isReplyToBot) {
            if (tenant.features.bully?.enabled) {
                try { await handleReply(ctx, tenant); } catch (err) {
                    console.error('[handlers] ошибка reply:', err);
                }
            }
            return next();
        }

        if (tenant.features.bully?.enabled && shouldRandomBully()) {
            try { await randomBully(ctx, tenant); } catch (err) {
                console.error('[handlers] ошибка random bully:', err);
            }
            return next();
        }

        const cigaretteConfig = tenant.features.cigarette ?? { enabled: false };
        if (cigaretteConfig.enabled && Math.random() < (cigaretteConfig.chance ?? 0)) {
            try {
                await requestCigarette(ctx, tenant);
            } catch (err) {
                console.error('[handlers] Не удалось отправить запрос на сигарету:', err);
            }
        }

        // FAQ: fires on @-mention, independent of the chain above. Silently
        // no-ops internally if this message doesn't actually mention the bot.
        if (tenant.features.faq?.enabled) {
            try {
                await handleFaqMention(ctx, tenant);
            } catch (err) {
                console.error('[handlers] ошибка faq:', err);
            }
        }

        return next();
    });

    registerCigaretteHandlers(bot);

    // Independent command features (joke / someshit / roast): registered
    // generically, gated by the resolved tenant. Add/remove one in
    // commandFeatureRegistry.js — nothing here needs to change.
    for (const { command, feature, handler } of COMMAND_FEATURES) {
        bot.command(command, async (ctx) => {
            const tenant = await resolveTenant(ctx.chat.id);
            if (!tenant.features[feature]?.enabled) return;
            try {
                await handler(ctx, tenant);
            } catch (err) {
                console.error(`[handlers] ошибка в команде /${command}:`, err);
                await ctx.reply(t(tenant, 'genericError'));
            }
        });
    }

    bot.command('summary', async (ctx) => {
        const tenant = await resolveTenant(ctx.chat.id);
        if (!tenant.features.summary?.enabled) return;

        const { allowed } = await checkUsageLimit(ctx.chat.id, 'summaryCallsPerDay');
        if (!allowed) {
            await ctx.reply(t(tenant, 'summaryLimitReached'));
            return;
        }

        try {
            await handleSummaryCommand(ctx, tenant);
        } catch (err) {
            console.error('[handlers] Ошибка при генерации выжимки:', err);
            await ctx.reply(t(tenant, 'summaryError'));
        }
    });

    bot.command('start', async (ctx) => {
        const tenant = await resolveTenant(ctx.chat.id);
        await ctx.reply(t(tenant, 'start', { botUsername: ctx.botInfo.username }));
    });
}


async function logIncomingMessage(ctx) {
    const msg = ctx.message;
    const chat = ctx.chat;

    await db.upsertChat({
        chatId: chat.id,
        title: chat.title || chat.username || `${chat.first_name || ''} ${chat.last_name || ''}`.trim(),
        chatType: chat.type,
    });

    // Auto-creates chat_settings with defaults on first contact from this chat.
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

async function handleSummaryCommand(ctx, tenant) {
    const chatId = ctx.chat.id;
    const periodArg = ctx.message.text.split(' ')[1]; // например "/summary 6h" -> "6h"

    const { periodStart, isCheckpoint } = await resolvePeriodStart(chatId, periodArg);
    const periodEnd = new Date();

    await ctx.reply(t(tenant, 'summaryInProgress'));

    const messages = await db.getMessagesSince(chatId, periodStart);
    const { summaryText, modelUsed, messagesUsed } = await generateSummary(messages, tenant);

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
        t(tenant, 'summaryResult', { periodLabel, messageCount: messages.length, summaryText }),
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