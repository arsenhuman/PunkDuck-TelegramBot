// autoSummaryScheduler.js
//
// The bot runs in a single process (long polling), so a separate
// cron/worker is not needed — a standard setInterval queries the DB every TICK_INTERVAL_MS
// asking "who is due" (see db.getChatsDueForAutoSummary) and runs
// generation for each chat. A 5-minute granularity is more than enough —
// the minimum available interval in /settings ("frequent") is 2 hours.

const db = require('./db');
const { resolveTenant } = require('../core/resolveTenant');
const { t } = require('../core/i18n');
const { generateSummary } = require('./summary');

const TICK_INTERVAL_MS = 5 * 60 * 1000;
const FALLBACK_PERIOD_MS = 24 * 60 * 60 * 1000; // if last_run_at is empty for some reason

async function runAutoSummaryTick(bot) {
    let dueChats;
    try {
        dueChats = await db.getChatsDueForAutoSummary();
    } catch (err) {
        console.error('[autoSummary] не смог получить список чатов:', err);
        return;
    }

    for (const row of dueChats) {
        try {
            await runOneAutoSummary(bot, row);
        } catch (err) {
            console.error(`[autoSummary] ошибка для чата ${row.chat_id}:`, err);
        }
    }
}

async function runOneAutoSummary(bot, row) {
    const tenant = await resolveTenant(row.chat_id);

    // Could have been disabled between the SELECT and this moment (adjacent tick, /settings) — double-checking.
    if (!tenant.features.autoSummary?.enabled) return;

    const periodStart = row.auto_summary_last_run_at ?? new Date(Date.now() - FALLBACK_PERIOD_MS);
    const periodEnd = new Date();
    const threadId = row.auto_summary_thread_id ?? null;

    const messages = await db.getMessagesSince(row.chat_id, periodStart);

    // Mark as "run completed" regardless of whether there was anything to write —
    // otherwise a quiet chat would be selected by getChatsDueForAutoSummary
    // on every tick and trigger generation needlessly.
    await db.markAutoSummaryRun(row.chat_id, periodEnd);

    if (messages.length === 0) return; // do not spam with empty digests

    const { summaryText, modelUsed, messagesUsed } = await generateSummary(messages, tenant);

    await db.saveSummary({
        chatId: row.chat_id,
        requestedBy: null, // auto-summary, not requested by a specific user
        periodStart,
        periodEnd,
        messageCount: messagesUsed,
        summaryText,
        modelUsed,
        isCheckpoint: true,
    });

    await bot.telegram.sendMessage(
        row.chat_id,
        t(tenant, 'autoSummaryResult', { messageCount: messages.length, summaryText }),
        { message_thread_id: row.auto_summary_thread_id ?? undefined, parse_mode: 'Markdown' }
    );
}

function startAutoSummaryScheduler(bot) {
    const timer = setInterval(() => runAutoSummaryTick(bot), TICK_INTERVAL_MS);
    // do not keep the process alive solely for this timer during graceful shutdown
    if (timer.unref) timer.unref();
    return timer;
}

module.exports = { startAutoSummaryScheduler, runAutoSummaryTick };