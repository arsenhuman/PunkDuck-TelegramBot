// faq.js — festival FAQ assistant.
//
// Two responsibilities:
//   1. handleSetFaq — an admin uploads a .txt/.md document (attached to the
//      /setfaq command, or replied-to) and we store its raw text per
//      chat_id in the faq_documents table.
//   2. handleFaqQuestion — when someone @-mentions the bot with a question,
//      we stuff the whole stored FAQ text into the system prompt (no
//      embeddings/chunking — a festival FAQ is small enough that this is
//      simpler, cheaper, and easier to debug than real RAG) and let the
//      model answer from it.

const OpenAI = require('openai');
const SETTINGS = require('../../settings');
const { t, getPrompt } = require('../core/i18n');
const { isChatAdmin } = require('../utils/adminCheck');
const db = require('../core/db');

const client = new OpenAI({ apiKey: SETTINGS.OPENAI_API_KEY });
const MODEL = SETTINGS.OPENAI_MODEL || 'gpt-4o-mini';

const ALLOWED_EXTENSIONS = ['.txt', '.md'];
const MAX_FAQ_CHARS = 20000; // safety cap on what we store/send to the model

function mentionsBot(ctx) {
    const text = ctx.message?.text;
    const username = ctx.botInfo?.username;
    if (!text || !username) return false;
    return text.toLowerCase().includes(`@${username.toLowerCase()}`);
}

function extractQuestion(ctx) {
    const text = ctx.message?.text || '';
    const username = ctx.botInfo?.username;
    if (!username) return text.trim();
    const mentionRe = new RegExp(`@${username}`, 'gi');
    return text.replace(mentionRe, '').trim();
}

async function handleSetFaq(ctx, tenant) {
    if (!(await isChatAdmin(ctx))) {
        await ctx.reply(t(tenant, 'faqSetNotAdmin'));
        return;
    }

    const doc = ctx.message?.document || ctx.message?.reply_to_message?.document;
    if (!doc) {
        await ctx.reply(t(tenant, 'faqSetUsage'));
        return;
    }

    const fileName = doc.file_name || '';
    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        await ctx.reply(t(tenant, 'faqSetBadFormat'));
        return;
    }

    const fileLink = await ctx.telegram.getFileLink(doc.file_id);
    const response = await fetch(fileLink.href ?? fileLink.toString());
    if (!response.ok) {
        throw new Error(`Failed to download FAQ document: ${response.status}`);
    }

    let content = (await response.text()).trim();
    if (!content) {
        await ctx.reply(t(tenant, 'faqSetBadFormat'));
        return;
    }
    if (content.length > MAX_FAQ_CHARS) {
        content = content.slice(0, MAX_FAQ_CHARS);
    }

    await db.saveFaqDocument({
        chatId: ctx.chat.id,
        content,
        updatedBy: ctx.from?.id ?? null,
    });

    await ctx.reply(t(tenant, 'faqSetSuccess', { charCount: content.length }));
}

async function handleFaqQuestion(ctx, tenant) {
    const question = extractQuestion(ctx);
    if (!question) return;

    const faqDoc = await db.getFaqDocument(ctx.chat.id);
    if (!faqDoc?.content) {
        await ctx.reply(t(tenant, 'faqNoContent'), { reply_to_message_id: ctx.message.message_id });
        return;
    }

    const systemPrompt =
        `${getPrompt(tenant, 'faq')}\n\n` +
        `Below is the festival's FAQ document. Answer the user's question using ONLY information ` +
        `found in it. If the answer isn't there, say you don't know instead of making something up.\n\n` +
        `"""\n${faqDoc.content}\n"""`;

    const response = await client.chat.completions.create({
        model: MODEL,
        max_tokens: 400,
        temperature: 0.3,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question },
        ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
        await ctx.reply(t(tenant, 'faqAnswerError'), { reply_to_message_id: ctx.message.message_id });
        return;
    }

    await ctx.reply(text, { reply_to_message_id: ctx.message.message_id });
}

module.exports = { mentionsBot, handleSetFaq, handleFaqQuestion };