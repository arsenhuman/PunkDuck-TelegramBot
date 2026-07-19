const OpenAI = require('openai');
const SETTINGS = require('../../settings');
const { t, getPrompt } = require('../core/i18n');

const client = new OpenAI({ apiKey: SETTINGS.OPENAI_API_KEY });
const MODEL = SETTINGS.OPENAI_MODEL || 'gpt-4o-mini';

let messageCounter = 0;

function shouldRandomBully() {
    messageCounter++;
    // каждые ~70-85 сообщений, с небольшой случайностью чтобы не было предсказуемо
    if (messageCounter >= 70 + Math.floor(Math.random() * 15)) {
        messageCounter = 0;
        return true;
    }
    return false;
}

async function randomBully(ctx, tenant) {
    const firstName = ctx.message?.from?.first_name || 'чувак';
    const phrase = t(tenant, 'bullyRandomPhrases');
    await ctx.reply(`${firstName}, ${phrase}`, {
        reply_to_message_id: ctx.message.message_id,
    });
}

async function handleRoast(ctx, tenant) {
    // берём текст реплая или аргумент команды
    const replyText = ctx.message?.reply_to_message?.text;
    const argText = ctx.message.text.split(' ').slice(1).join(' ');
    const target = replyText || argText;

    if (!target) {
        await ctx.reply(t(tenant, 'roastNoTarget'));
        return;
    }

    const response = await client.chat.completions.create({
        model: MODEL,
        max_tokens: 100,
        temperature: 0.9,
        messages: [
            { role: 'system', content: getPrompt(tenant, 'bully') },
            { role: 'user', content: `пройдись по этому сообщению: "${target}"` },
        ],
    });

    const text = response.choices[0]?.message?.content?.trim() || 'ну такое.';
    await ctx.reply(text, { reply_to_message_id: ctx.message.message_id });
}

async function handleReply(ctx, tenant) {
    const userText = ctx.message?.text;
    if (!userText) return;

    const firstName = ctx.message?.from?.first_name || '';

    const response = await client.chat.completions.create({
        model: MODEL,
        max_tokens: 80,
        temperature: 0.9,
        messages: [
            { role: 'system', content: getPrompt(tenant, 'bully') },
            { role: 'user', content: `${firstName} пишет тебе: "${userText}"` },
        ],
    });

    const text = response.choices[0]?.message?.content?.trim() || 'угу.';
    await ctx.reply(text, { reply_to_message_id: ctx.message.message_id });
}

module.exports = { shouldRandomBully, randomBully, handleRoast, handleReply };