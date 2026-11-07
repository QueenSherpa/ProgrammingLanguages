const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { createUserSchema } = require('../userSchema');
const { validateCredentials } = require('../validation');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

function publicUser(u) {
  return { id: u.id, username: u.username, is_admin: u.is_admin, daily_goal: u.daily_goal };
}

router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = validateCredentials(req.body);
    const hash = await bcrypt.hash(password, 10);
    const user = await db.withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO users (username, password_hash) VALUES ($1, $2)
         ON CONFLICT (username) DO NOTHING
         RETURNING id, username, is_admin, daily_goal`,
        [username, hash]
      );
      if (!rows.length) return null;
      await createUserSchema(client, rows[0].id);
      return rows[0];
    });
    if (!user) return res.status(409).json({ error: 'Username is already taken' });
    return res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = router;
