// adminCheck.js
//
// Shared helper: is the user who triggered ctx allowed to change chat-level
// settings (FAQ document, /settings menu, etc)? In a group/supergroup that
// means "chat administrator or creator"; in a private chat there's no
// concept of admins, so the sole person there is trivially authorized.
const SETTINGS = require('../../settings');

async function isChatAdmin(ctx) {
    if (SETTINGS.BOT_OWNER_ID && ctx.from?.id === SETTINGS.BOT_OWNER_ID) return true;

    if (ctx.chat.type === 'private') return true;
    try {
        const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
        return member.status === 'administrator' || member.status === 'creator';
    } catch (err) {
        console.error('[adminCheck] Не удалось проверить права администратора:', err);
        return false;
    }
}

module.exports = { isChatAdmin };