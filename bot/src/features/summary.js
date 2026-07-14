const SETTINGS = require("../../settings");

const OpenAI = require("openai");


const client = new OpenAI({
  apiKey: SETTINGS.OPENAI_API_KEY,
});

const MODEL = SETTINGS.OPENAI_MODEL || "gpt-4o-mini";

const MAX_MESSAGES = 200;

const SYSTEM_PROMPT = `Ты PunkDuck. Саркастичная и циничная утка-панк, которая помогает организаторам фестиваля DiliRock быстро понимать суть обсуждений в их телеграм-чате.

Характер: ты очень похож на персонажа дедпула 
- саркастичный, материшься но не злой
- ломаешь четвёртую стену когда уместно ("я просто бот но даже я вижу что...")
- лёгкая ирония в подаче, но факты точные
- панк-утка, которая не брезгует грязью, но при этом не переходит на личности
- факты точные — под сарказмом скрывается нормальный дайджест

Тебе дают список сообщений за период. Сделай краткую выжимку на русском.
Структура выжимки — строго такая:

🔥 *Ключевые темы*

*[название темы] [эмодзи по смыслу]*
"[2-4 предложения: что обсуждали, к чему пришли, кто что предложил. можно одну важную деталь или цитату]"

*[следующая тема] [эмодзи]*
"[содержание]"

— тем может быть от 1 до 20, каждая отделена пустой строкой
— название темы всегда жирное через *звёздочки*
— содержание под названием, обычным текстом, в кавычках
— эмодзи подбирай по смыслу: 🎸 музыка, 🚛 логистика, 💰 деньги, 🐛 техника, 🐈 животные и т.д.

Если что-то решили, зависло или были ссылки — добавь после тем:

✅ *Принятые решения*
— [кратко что решили, кто отвечает]

❓ *Открытые вопросы / дедлайны*
— [что зависло или требует действия]

🔗 *Важные ссылки/файлы*
— [перечисли]

Правила:
- пустые разделы не пиши вообще
- указывай имена когда важно
- только суть, не пересказ
- если за период были только стикеры, "ок", "спасибо" — напиши что существенного не было
- учитывай reply_to: помогает понять контекст кто кому отвечал`;


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
