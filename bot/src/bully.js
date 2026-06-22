const OpenAI = require('openai');
const SETTINGS = require('../settings');

const client = new OpenAI({ apiKey: SETTINGS.OPENAI_API_KEY });
const MODEL = SETTINGS.OPENAI_MODEL || 'gpt-4o-mini';

const BULLY_PROMPT = `Ты PunkDuck — саркастичная утка-панк в чате организаторов фестиваля.
Отвечай максимум 1-2 предложения. Быкуй, но без злобы.
Можешь подколоть, можешь послать, но по-панковски — с характером, не с ненавистью.
Только русский язык. Никаких объяснений, никакой вежливости.`;

const RANDOM_BULLY_PHRASES = [
    'ну ты бы хоть с кем то посоветловался бы прежде чем писать такое',
    'ахах я это пересылаю в наш ботовсем чат поугорать',
    'окей. записал. всё ещё не понимаю зачем',
    'это важное сообщение. очень.',
    'чат стал богаче от этого сообщения.',
    'я это сохранил в базу. жаль.',
    'принято. проигнорировано.',
    'ты бы следил за тем что пишешь. я же записываю всё.',

];

let messageCounter = 0;

function shouldRandomBully() {
    messageCounter++;
    // каждые ~50 сообщений, с небольшой случайностью чтобы не было предсказуемо
    if (messageCounter >= 70 + Math.floor(Math.random() * 15)) {
        messageCounter = 0;
        return true;
    }
    return false;
}

async function randomBully(ctx) {
    const firstName = ctx.message?.from?.first_name || 'чувак';
    const phrase = RANDOM_BULLY_PHRASES[Math.floor(Math.random() * RANDOM_BULLY_PHRASES.length)];
    await ctx.reply(`${firstName}, ${phrase}`, {
        reply_to_message_id: ctx.message.message_id,
    });
}

async function handleRoast(ctx) {
    // берём текст реплая или аргумент команды
    const replyText = ctx.message?.reply_to_message?.text;
    const argText = ctx.message.text.split(' ').slice(1).join(' ');
    const target = replyText || argText;

    if (!target) {
        await ctx.reply('на что roast-то? ответь на чьё-нибудь сообщение или напиши /roast <текст>');
        return;
    }

    const response = await client.chat.completions.create({
        model: MODEL,
        max_tokens: 100,
        temperature: 0.9,
        messages: [
            { role: 'system', content: BULLY_PROMPT },
            { role: 'user', content: `пройдись по этому сообщению: "${target}"` },
        ],
    });

    const text = response.choices[0]?.message?.content?.trim() || 'ну такое.';
    await ctx.reply(text, { reply_to_message_id: ctx.message.message_id });
}

async function handleReply(ctx) {
    const userText = ctx.message?.text;
    if (!userText) return;

    const firstName = ctx.message?.from?.first_name || '';

    const response = await client.chat.completions.create({
        model: MODEL,
        max_tokens: 80,
        temperature: 0.9,
        messages: [
            { role: 'system', content: BULLY_PROMPT },
            { role: 'user', content: `${firstName} пишет тебе: "${userText}"` },
        ],
    });

    const text = response.choices[0]?.message?.content?.trim() || 'угу.';
    await ctx.reply(text, { reply_to_message_id: ctx.message.message_id });
}

module.exports = { shouldRandomBully, randomBully, handleRoast, handleReply };