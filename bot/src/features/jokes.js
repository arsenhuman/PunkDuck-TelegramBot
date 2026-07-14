const fs = require('fs');
const path = require('path');

// bot/src/features/jokes.js -> up two levels to bot/, then content/jokes.json
const JOKES_PATH = path.join(__dirname, '../../content/jokes.json');
const jokes = JSON.parse(fs.readFileSync(JOKES_PATH, 'utf-8'));

function getRandomJoke() {
    return jokes[Math.floor(Math.random() * jokes.length)].text;
}

module.exports = { getRandomJoke };
