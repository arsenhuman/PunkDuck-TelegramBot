
const fs = require('fs');
const path = require('path');
const { pool, closePool } = require('./db');
 
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
 
async function ensureMigrationsTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename    TEXT PRIMARY KEY,
            applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);
}
 
async function getAppliedMigrations() {
    const { rows } = await pool.query('SELECT filename FROM schema_migrations');
    return new Set(rows.map((r) => r.filename));
}
 
async function runMigrations() {
    await ensureMigrationsTable();
    const applied = await getAppliedMigrations();
 
    const files = fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort();
 
    for (const file of files) {
        if (applied.has(file)) {
            console.log(`[migrate] Skipping ${file} (already applied)`);
            continue;
        }
 
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
        console.log(`[migrate] Applying ${file}...`);
 
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
            await client.query('COMMIT');
            console.log(`[migrate] ✓ ${file} applied successfully.`);
        } catch (err) {
            await client.query('ROLLBACK');
            throw new Error(`Migration ${file} failed: ${err.message}`);
        } finally {
            client.release();
        }
    }
 
    console.log('[migrate] All migrations applied.');
}
 
if (require.main === module) {
    runMigrations()
        .catch((err) => {
            console.error('[migrate] Error:', err.message);
            process.exitCode = 1;
        })
        .finally(() => closePool());
}
 
module.exports = { runMigrations };
