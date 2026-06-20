const { Pool } = require('pg');
const SETTINGS = require('../config/settings');


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