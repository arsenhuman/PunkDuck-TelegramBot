const OpenAI = require('openai');
const SETTINGS = require('../../settings');
const { t } = require('../core/i18n');

const client = new OpenAI({ apiKey: SETTINGS.OPENAI_API_KEY });
const MODEL = SETTINGS.OPENAI_MODEL || 'gpt-4o-mini';

async function handleGpt(ctx, tenant) {
    const question = ctx.message.text.split(' ').slice(1).join(' ').trim();

    if (!question) {
        await ctx.reply(t(tenant, 'gptNoQuestion'));
        return;
    }

    const response = await client.chat.completions.create({
        model: MODEL,
        max_tokens: 500,
        temperature: 0.7,
        messages: [
            { role: 'user', content: question },
        ],
    });

    const text = response.choices[0]?.message?.content?.trim() || t(tenant, 'emptyModelResponse');
    await ctx.reply(text, { reply_to_message_id: ctx.message.message_id });
}

module.exports = { handleGpt };