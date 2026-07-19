const SETTINGS = require("../../settings");
const OpenAI = require("openai");
const { t, getPrompt } = require('../core/i18n');

const client = new OpenAI({
  apiKey: SETTINGS.OPENAI_API_KEY,
});

const MODEL = SETTINGS.OPENAI_MODEL || "gpt-4o-mini";

const MAX_MESSAGES = 200;


function formatMessage(row) {
    const author = row.first_name || row.username || `user${row.user_id}`;
    const time = new Date(row.sent_at).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });

    let body;
    if (row.message_type === 'text') {
        body = row.text_content;
    } else if (row.text_content) {
        body = `[${row.message_type}] ${row.text_content}`;
    } else {
        body = `[${row.message_type}]`;
    }

    let line = `[${time}] ${author}: ${body}`;
    if (row.replied_to_text) {
        const replyAuthor = row.replied_to_author || '?';
        line += ` (в ответ ${replyAuthor}: "${truncate(row.replied_to_text, 60)}")`;
    }
    return line;
}

function truncate(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}


async function generateSummary(messageRows, tenant) {
    if (messageRows.length === 0) {
        return {
            summaryText: t(tenant, 'noMessagesInPeriod'),
            modelUsed: null,
            messagesUsed: 0,
        };
    }

    const trimmed = messageRows.length > MAX_MESSAGES
        ? messageRows.slice(-MAX_MESSAGES)
        : messageRows;

    const chatLog = trimmed.map(formatMessage).join('\n');

    const userPrompt = trimmed.length < messageRows.length
        ? `(Показаны только последние ${MAX_MESSAGES} из ${messageRows.length} сообщений за период)\n\n${chatLog}`
        : chatLog;

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'system', content: getPrompt(tenant, 'summary') },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
    });

    const summaryText = response.choices[0]?.message?.content?.trim() || t(tenant, 'emptyModelResponse');

    return {
        summaryText,
        modelUsed: MODEL,
        messagesUsed: trimmed.length,
    };
}

module.exports = { generateSummary };