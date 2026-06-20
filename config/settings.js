require('dotenv').config();

const SETTINGS = {
    PGHOST: process.env.PGHOST || 'localhost',
    PGPORT: process.env.PGPORT || 5432,
    PGUSER: process.env.PGUSER,
    PGPASSWORD: process.env.PGPASSWORD,
    PGDATABASE: process.env.PGDATABASE   
}

module.exports = SETTINGS;