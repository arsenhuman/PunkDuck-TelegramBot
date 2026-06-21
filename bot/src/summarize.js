const SETTINGS = require("../settings");

const OpenAI = require("openai");


const client = new OpenAI({
  apiKey: SETTINGS.OPENAI_API_KEY,
});

const MODEL = SETTINGS.OPENAI_MODEL || "gpt-4o-mini";

const MAX_MESSAGES = 200;

const SYSTEM_PROMPT = `Ты помогаешь организаторам летнего музыкального фестиваля DiliRock
следить за обсуждением в их рабочем телеграм-чате. Тебе дают список сообщений за период.
 
Сделай краткую выжимку на русском языке со следующей структурой:
 
1. **Ключевые темы** — о чём говорили, сгруппированно по смыслу (не по хронологии)
2. **Принятые решения** — если что-то было решено, кратко зафиксируй
3. **Открытые вопросы / дедлайны** — что осталось без ответа или требует действия
4. **Важные ссылки/файлы** — если упоминались (просто перечисли, что было)
 
Если в каком-то разделе ничего нет — не пиши пустой раздел, просто пропусти его.
Указывай имена участников, когда это важно для понимания (кто предложил, кто отвечает за что).
Будь краткой и по делу — это рабочий дайджест, а не пересказ всего подряд.
Если сообщений было мало или они малозначительны (стикеры, "ок", "спасибо") — можно написать,
что существенных обсуждений за период не было.`;


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
        // вложение с подписью, например фото с caption
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
        // вложение с подписью, например фото с caption
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


async function generateSummary(messageRows) {
    if (messageRows.length === 0) {
        return {
            summaryText: 'За выбранный период сообщений не было.',
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
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
    });
 
    const summaryText = response.choices[0]?.message?.content?.trim() || 'Не удалось сгенерировать выжимку.';
 
    return {
        summaryText,
        modelUsed: MODEL,
        messagesUsed: trimmed.length,
    };
}
 
module.exports = { generateSummary };
 