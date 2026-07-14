// tenantSettings.js
//
// Thin data-access layer over the chat_settings table. Doesn't know about
// edition presets or defaults — that's resolveTenant.js's job. This file only
// knows how to read/insert/update rows.

const { pool } = require('./db');

async function getTenantRow(chatId) {
    const { rows } = await pool.query(
        `SELECT chat_id, edition, plan, language, features, usage_limits, created_at, updated_at
         FROM chat_settings WHERE chat_id = $1`,
        [chatId]
    );
    return rows[0] ?? null;
}

/**
 * Inserts a chat_settings row with the given defaults. Safe to call even if
 * a row might already exist (e.g. a concurrent message from the same chat
 * triggering this at the same time) — ON CONFLICT DO NOTHING means this
 * simply returns null if another insert won the race, and the caller should
 * re-read the row.
 */
async function insertTenantDefaults({ chatId, edition, language, features, usageLimits }) {
    const { rows } = await pool.query(
        `INSERT INTO chat_settings (chat_id, edition, language, features, usage_limits)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
         ON CONFLICT (chat_id) DO NOTHING
         RETURNING chat_id, edition, plan, language, features, usage_limits, created_at, updated_at`,
        [chatId, edition, language, JSON.stringify(features), JSON.stringify(usageLimits)]
    );
    return rows[0] ?? null;
}

/**
 * Partial update. `features` and `usageLimits`, if given, are shallow-merged
 * into the existing JSONB (via Postgres's `||` operator) rather than
 * replacing it wholesale — so passing { bully: { enabled: false } } only
 * touches the "bully" key.
 */
async function updateTenantSettings(chatId, patch) {
    const sets = [];
    const values = [];
    let i = 1;

    if (patch.edition) { sets.push(`edition = $${i++}`); values.push(patch.edition); }
    if (patch.plan) { sets.push(`plan = $${i++}`); values.push(patch.plan); }
    if (patch.language) { sets.push(`language = $${i++}`); values.push(patch.language); }
    if (patch.features) { sets.push(`features = features || $${i++}::jsonb`); values.push(JSON.stringify(patch.features)); }
    if (patch.usageLimits) { sets.push(`usage_limits = usage_limits || $${i++}::jsonb`); values.push(JSON.stringify(patch.usageLimits)); }

    if (sets.length === 0) return getTenantRow(chatId);

    sets.push(`updated_at = now()`);
    values.push(chatId);

    const { rows } = await pool.query(
        `UPDATE chat_settings SET ${sets.join(', ')} WHERE chat_id = $${i} RETURNING *`,
        values
    );
    return rows[0] ?? null;
}

module.exports = { getTenantRow, insertTenantDefaults, updateTenantSettings };