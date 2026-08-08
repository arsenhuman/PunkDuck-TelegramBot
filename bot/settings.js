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
    OPENAI_MODEL_BULLY: process.env.OPENAI_MODEL_BULLY || 'gpt-4o',
    BOT_OWNER_ID: process.env.BOT_OWNER_ID ? Number(process.env.BOT_OWNER_ID) : null,
}

module.exports = SETTINGS;