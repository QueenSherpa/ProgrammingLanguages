const bcrypt = require('bcryptjs');
const db = require('./db');
const config = require('./config');
const { createUserSchema } = require('./userSchema');

async function migrate() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
      daily_goal    INTEGER NOT NULL DEFAULT 2000 CHECK (daily_goal BETWEEN 500 AND 10000),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key        TEXT PRIMARY KEY,
      value      JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
}

// Creates (or promotes) the admin account from ADMIN_USERNAME / ADMIN_PASSWORD.
async function ensureAdmin() {
  if (!config.adminPassword) return null;
  return db.withTransaction(async (client) => {
    const existing = await client.query('SELECT id FROM users WHERE username = $1', [
      config.adminUsername,
    ]);
    if (existing.rows.length) {
      await client.query('UPDATE users SET is_admin = TRUE WHERE id = $1', [existing.rows[0].id]);
      return existing.rows[0].id;
    }
    const hash = await bcrypt.hash(config.adminPassword, 10);
    const { rows } = await client.query(
      'INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, TRUE) RETURNING id',
      [config.adminUsername, hash]
    );
    await createUserSchema(client, rows[0].id);
    return rows[0].id;
  });
}

module.exports = { migrate, ensureAdmin };

if (require.main === module) {
  migrate()
    .then(ensureAdmin)
    .then(() => {
      console.log('Migrations complete');
      return db.pool.end();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
