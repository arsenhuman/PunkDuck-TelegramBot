require('dotenv').config();

const SETTINGS = {
    PGHOST: process.env.PGHOST || 'localhost',
    PGPORT: process.env.PGPORT || 5432,
    PGUSER: process.env.PGUSER,
    PGPASSWORD: process.env.PGPASSWORD,
    PGDATABASE: process.env.PGDATABASE,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    BOT_TOlKEN: process.env.BOT_TOKEN
}

module.exports = SETTINGS;