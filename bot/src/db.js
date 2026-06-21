const { Pool } = require('pg');
const SETTINGS = require('../settings');


const pool = new Pool({
    host: SETTINGS.PGHOST,
    port: SETTINGS.PGPORT,
    user: SETTINGS.PGUSER,
    password: SETTINGS.PGPASSWORD,
    database: SETTINGS.PGDATABASE,
    max: 5
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

async function upsertChat({ chatId, title, chatType }) {
    await pool.query(
        `INSERT INTO chats (chat_id, title, chat_type)
         VALUES ($1, $2, $3)
         ON CONFLICT (chat_id)
         DO UPDATE SET title = EXCLUDED.title, is_active = true`,
        [chatId, title, chatType]
    );
}

async function saveMessage({
    telegramMsgId,
    chatId,
    userId,
    username,
    firstName,
    messageType,
    textContent,
    replyToMsgId,
    sentAt,
}) {
    await pool.query(
        `INSERT INTO messages (
            telegram_msg_id, chat_id, user_id, username, first_name,
            message_type, text_content, reply_to_msg_id, sent_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (chat_id, telegram_msg_id) DO NOTHING`,
        [telegramMsgId, chatId, userId, username, firstName, messageType, textContent, replyToMsgId, sentAt]
    );
}

 
async function getMessagesSince(chatId, sinceDate) {
    const { rows } = await pool.query(
        `SELECT
            m.telegram_msg_id,
            m.user_id,
            m.username,
            m.first_name,
            m.message_type,
            m.text_content,
            m.sent_at,
            parent.first_name AS replied_to_author,
            parent.text_content AS replied_to_text
         FROM messages m
         LEFT JOIN messages parent
            ON parent.chat_id = m.chat_id
            AND parent.telegram_msg_id = m.reply_to_msg_id
         WHERE m.chat_id = $1 AND m.sent_at >= $2
         ORDER BY m.sent_at ASC`,
        [chatId, sinceDate]
    );
    return rows;
}


async function saveSummary({ chatId, requestedBy, periodStart, periodEnd, messageCount, summaryText, modelUsed }) {
    await pool.query(
        `INSERT INTO summaries (chat_id, requested_by, period_start, period_end, message_count, summary_text, model_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [chatId, requestedBy, periodStart, periodEnd, messageCount, summaryText, modelUsed]
    );
}
 
async function getLastSummaryTime(chatId) {
    const { rows } = await pool.query(
        `SELECT period_end FROM summaries WHERE chat_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [chatId]
    );
    return rows[0]?.period_end ?? null;
}
 

async function createCigaretteRequest({ chatId, botMsgId }) {
    await pool.query(
        `INSERT INTO cigarette_events (chat_id, bot_msg_id) VALUES ($1, $2)`,
        [chatId, botMsgId]
    );
}


async function tryGiveCigarette({ chatId, botMsgId, userId, firstName }) {
    const { rowCount } = await pool.query(
        `UPDATE cigarette_events
         SET given_by_user_id = $3, given_by_first_name = $4, given_at = now()
         WHERE chat_id = $1 AND bot_msg_id = $2 AND given_by_user_id IS NULL`,
        [chatId, botMsgId, userId, firstName]
    );
    return rowCount === 1;
}


async function closePool() {
    await pool.end();
}
 

module.exports = {
    pool,
    upsertChat,
    saveMessage,
    getMessagesSince,
    saveSummary,
    getLastSummaryTime,
    createCigaretteRequest,
    tryGiveCigarette,
    closePool,
};
