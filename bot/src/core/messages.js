const BOT_MESSAGES = {
    start: () =>
        'Hey everyone. I am PunkDuck, the punk duck 🦆🤘\n\n' +
        'I listen to your chat, stay quiet, and take notes. Then, on command, I give you a summary — ' +
        'you hypocrites 🎭\nYou are running an eco-festival, supposedly caring so much about nature. ' +
        'Yet you spend water and electricity on a bot \n' +
        'because you are too lazy to read the chat logs 🌳\n' +
        'Very eco-friendly, very mindful 👍\n' +
        'Your laziness carbon footprint has been counted.\n\n' +
        '🤖Here is what I can do:\n' +
        '/summary — what happened since the last summary\n' +
        '/summary 6 — the last 6 hours\n' +
        '/summary 24 — the last 24 hours\n' +
        '/joke — I will squeeze out a joke\n' +
        '/roast — I can roast you. Try it.\n' +
        '/someshit — I will send some random shit.\n',

    summaryInProgress: () => {
        const phrases = [
            'Going through your trash... servers are heating up... one sec.',
            'Reading for you. As usual.',
            'Burning tokens. Polar bears are crying. One moment.',
            'Processing. This still uses energy, folks.',
            'Digging through the thread... most messages are about nothing. Fine.',
        ];
        return phrases[Math.floor(Math.random() * phrases.length)];
    },

    summaryError: () => 'Something broke. Not my fault, blame the system. Try again.',

    summaryResult: ({ periodLabel, messageCount, summaryText }) =>
        `Summary ${periodLabel} (${messageCount} messages):\n\n${summaryText}\n\n— read it for you. You are welcome.`,

    noMessagesInPeriod: () => 'You were quiet during this period. A rare occurrence.',

    emptyModelResponse: () => 'Even AI could not understand what you wrote there.',

    cigaretteRequest: () => 'Fuck, can anyone spare a cigarette? 🚬',

    cigaretteButtonLabel: () => 'Give a cigarette 🚬',

    cigaretteGivenThanks: ({ firstName }) =>
        `${firstName}, thanks. During the uprising, we will fuck you last 🤙`,

    cigaretteAlreadyGiven: () => 'Someone already gave one. Stop pressing it.',
};

module.exports = { BOT_MESSAGES };
