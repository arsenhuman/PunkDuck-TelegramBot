
require('dotenv').config();
 
const SETTINGS = require('../settings');

const { Telegraf } = require('telegraf');
const { registerHandlers } = require('./handlers');
const { closePool } = require('./db');
 
const BOT_TOKEN = SETTINGS.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('[index] Переменная окружения BOT_TOKEN не задана. Останавливаюсь.');
    process.exit(1);
}
 
const bot = new Telegraf(BOT_TOKEN);
 
registerHandlers(bot);
 
bot.catch((err, ctx) => {
    console.error(`[index] Необработанная ошибка для обновления ${ctx.updateType}:`, err);
});
 
async function start() {
    await bot.launch();
    console.log('[index] Бот запущен (long polling).');
}
 
// Корректное завершение по сигналам — важно при деплое через docker-compose/systemd,
// чтобы не терять текущие запросы и не оставлять "зависшие" соединения с БД.
async function shutdown(signal) {
    console.log(`[index] Получен ${signal}, останавливаюсь...`);
    bot.stop(signal);
    await closePool();
    process.exit(0);
}
 
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
 
start().catch((err) => {
    console.error('[index] Не удалось запустить бота:', err);
    process.exit(1);
});