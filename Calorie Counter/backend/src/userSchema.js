// Every user gets their own isolated Postgres schema ("user_<id>") that holds
// their food log. Shared data (accounts, app settings) lives in "public".

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];

function schemaNameFor(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid user id');
  return `user_${id}`;
}

async function createUserSchema(client, userId) {
  const schema = schemaNameFor(userId);
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.entries (
      id          SERIAL PRIMARY KEY,
      entry_date  DATE NOT NULL DEFAULT CURRENT_DATE,
      meal        TEXT NOT NULL DEFAULT 'snack'
                  CHECK (meal IN (${MEALS.map((m) => `'${m}'`).join(', ')})),
      food        TEXT NOT NULL CHECK (char_length(food) BETWEEN 1 AND 120),
      calories    INTEGER NOT NULL CHECK (calories BETWEEN 0 AND 20000),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await client.query(
    `CREATE INDEX IF NOT EXISTS entries_date_idx ON ${schema}.entries (entry_date)`
  );
  return schema;
}

async function dropUserSchema(client, userId) {
  await client.query(`DROP SCHEMA IF EXISTS ${schemaNameFor(userId)} CASCADE`);
}

module.exports = { MEALS, schemaNameFor, createUserSchema, dropUserSchema };
