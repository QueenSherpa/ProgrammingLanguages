// Data access for a single user's food log, shared by user and admin routes.
const db = require('./db');
const { schemaNameFor } = require('./userSchema');

const COLUMNS = "id, to_char(entry_date, 'YYYY-MM-DD') AS date, meal, food, calories, created_at";

async function listForDate(userId, date) {
  const schema = schemaNameFor(userId);
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM ${schema}.entries WHERE entry_date = $1 ORDER BY created_at, id`,
    [date]
  );
  const total = rows.reduce((sum, r) => sum + r.calories, 0);
  return { date, entries: rows, total };
}

async function create(userId, entry) {
  const schema = schemaNameFor(userId);
  const { rows } = await db.query(
    `INSERT INTO ${schema}.entries (entry_date, meal, food, calories)
     VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
    [entry.entry_date, entry.meal, entry.food, entry.calories]
  );
  return rows[0];
}

async function update(userId, entryId, fields) {
  const schema = schemaNameFor(userId);
  const keys = Object.keys(fields);
  if (!keys.length) return null;
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const { rows } = await db.query(
    `UPDATE ${schema}.entries SET ${sets} WHERE id = $${keys.length + 1} RETURNING ${COLUMNS}`,
    [...keys.map((k) => fields[k]), entryId]
  );
  return rows[0] || null;
}

async function remove(userId, entryId) {
  const schema = schemaNameFor(userId);
  const { rowCount } = await db.query(`DELETE FROM ${schema}.entries WHERE id = $1`, [entryId]);
  return rowCount > 0;
}

// Daily totals for the last `days` days ending at `endDate`, with zero-filled gaps.
async function summary(userId, days, endDate) {
  const schema = schemaNameFor(userId);
  const { rows } = await db.query(
    `SELECT to_char(d::date, 'YYYY-MM-DD') AS date,
            COALESCE(SUM(e.calories), 0)::int AS total
       FROM generate_series($1::date - ($2::int - 1), $1::date, interval '1 day') AS d
       LEFT JOIN ${schema}.entries e ON e.entry_date = d::date
      GROUP BY d ORDER BY d`,
    [endDate, days]
  );
  return rows;
}

async function stats(userId) {
  const schema = schemaNameFor(userId);
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS entry_count,
            COALESCE(SUM(calories) FILTER (WHERE entry_date = CURRENT_DATE), 0)::int AS today_total,
            to_char(MAX(entry_date), 'YYYY-MM-DD') AS last_entry
       FROM ${schema}.entries`
  );
  return rows[0];
}

module.exports = { listForDate, create, update, remove, summary, stats };
