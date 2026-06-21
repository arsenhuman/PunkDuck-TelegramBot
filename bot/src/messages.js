

const BOT_MESSAGES = {
    start: () =>
        'Привет! Я бот DiliRock 🎸\n\n' +
        'Я тихо записываю сообщения в этом чате, а по команде /summary делаю краткую выжимку.\n\n' +
        'Примеры:\n' +
        '/summary — выжимка с прошлого раза (или за последние 24ч, если выжимок ещё не было)\n' +
        '/summary 6h — выжимка за последние 6 часов\n' +
        '/summary 3d — выжимка за последние 3 дня',

    summaryInProgress: () => 'Собираю выжимку, секунду…',

    summaryError: () => 'Не получилось сделать выжимку — что-то пошло не так. Попробуй ещё раз чуть позже.',

    summaryResult: ({ periodLabel, messageCount, summaryText }) =>
        `📋 Выжимка ${periodLabel} (${messageCount} сообщ.):\n\n${summaryText}`,

    noMessagesInPeriod: () => 'За выбранный период сообщений не было.',

    emptyModelResponse: () => 'Не удалось сгенерировать выжимку.',

    // Фича "утка-панк просит сигарету" — раз в какое-то время бот рандомно
    // шлёт это сообщение с кнопкой. Меняешь характер бота — меняешь тут.
    cigaretteRequest: () => 'Так... есть у кого-нибудь сигаретка? 🚬',

    cigaretteButtonLabel: () => 'Дать сигарету 🚬',

    cigaretteGivenThanks: ({ firstName }) => `${firstName} достаёт сигарету. Спасибо, братан 🤙`,

    cigaretteAlreadyGiven: () => 'Уже дали, не жмякай',
};

module.exports = { BOT_MESSAGES };