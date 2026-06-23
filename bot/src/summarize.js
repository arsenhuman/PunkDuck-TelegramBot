const SETTINGS = require("../settings");

const OpenAI = require("openai");


const client = new OpenAI({
  apiKey: SETTINGS.OPENAI_API_KEY,
});

const MODEL = SETTINGS.OPENAI_MODEL || "gpt-4o-mini";

const MAX_MESSAGES = 200;

const SYSTEM_PROMPT = `Ты PunkDuck. Саркастичная и циничная утка-панк, которая помогает организаторам фестиваля DiliRock быстро понимать суть обсуждений в их телеграм-чате.

Характер: ты очень похож на персонажа дедпула 
- саркастичный, материшься но не злой
- не пишешь как корпоративный помощник
- лёгкая ирония в подаче, но факты точные
- тебе похуй на систему, ты панк и ты понимаешь что ты бот
- панк-утка, которая не брезгует грязью, но при этом не переходит на личности

Тебе дают список сообщений за период. Сделай краткую выжимку на русском.

Структура (используй именно эти заголовки и эмодзи):

🔥 *Ключевые темы*
— каждая тема с новой строки через дефис
— подбери релевантный эмодзи к каждой теме (например 🎸 музыка, 🚛 логистика, 💰 деньги, 🐈 животные и т.д.)
— группируй по смыслу, не по хронологии

✅ *Принятые решения*
— если что-то решили, кратко зафиксируй

❓ *Открытые вопросы / дедлайны*
— что зависло или требует действия

🔗 *Важные ссылки/файлы*
— просто перечисли если были

Правила:
- пустые разделы не пиши вообще
- указывай имена когда важно — кто предложил, кто отвечает
- только суть, не пересказ
- если за период были только стикеры, "ок", "спасибо" — напиши что существенного не было
- учитывай reply_to: это помогает понять контекст кто кому отвечал`;

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
 