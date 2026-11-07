const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const db = require('../src/db');
const { migrate } = require('../src/migrate');
const { createUserSchema } = require('../src/userSchema');

async function resetDb() {
  const { rows } = await db.query(
    "SELECT nspname FROM pg_namespace WHERE nspname ~ '^user_[0-9]+$'"
  );
  for (const { nspname } of rows) {
    await db.query(`DROP SCHEMA ${nspname} CASCADE`);
  }
  await db.query('DROP TABLE IF EXISTS users, app_settings CASCADE');
  await migrate();
}

async function register(username, password = 'password123') {
  const res = await request(app).post('/api/auth/register').send({ username, password });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

async function createAdmin(username = 'boss', password = 'adminpass123') {
  const hash = await bcrypt.hash(password, 4);
  const { rows } = await db.query(
    'INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, TRUE) RETURNING id',
    [username, hash]
  );
  await createUserSchema(db, rows[0].id);
  const res = await request(app).post('/api/auth/login').send({ username, password });
  return res.body;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { app, db, request, resetDb, register, createAdmin, auth };
