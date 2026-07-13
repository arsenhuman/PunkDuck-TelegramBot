require('dotenv').config();

const SETTINGS = {
    PGHOST: process.env.PGHOST || 'localhost',
    PGPORT: process.env.PGPORT || 5432,
    PGUSER: process.env.PGUSER,
    PGPASSWORD: process.env.PGPASSWORD,
    PGDATABASE: process.env.PGDATABASE,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    BOT_TOKEN: process.env.BOT_TOKEN,
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
}

module.exports = SETTINGS;