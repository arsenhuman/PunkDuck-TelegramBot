
require('dotenv').config();
 
const SETTINGS = require('../settings');

const { Telegraf } = require('telegraf');
const { registerHandlers } = require('./handlers');
const { closePool } = require('./core/db');
 
const BOT_TOKEN = SETTINGS.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('[index] Environment variable BOT_TOKEN is not set. Stopping.');
    process.exit(1);
}
 
const bot = new Telegraf(BOT_TOKEN);
 
registerHandlers(bot);
 
bot.catch((err, ctx) => {
    console.error(`[index] Unhandled error for update ${ctx.updateType}:`, err);
});
 
async function start() {
    await bot.launch();
    console.log('[index] Bot started (long polling).');
}
 
async function shutdown(signal) {
    console.log(`[index] Received ${signal}, stopping...`);
    bot.stop(signal);
    await closePool();
    process.exit(0);
}
 
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
 
start().catch((err) => {
    console.error('[index] Failed to start bot:', err);
    process.exit(1);
});