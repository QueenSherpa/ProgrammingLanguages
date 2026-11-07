const express = require('express');
const db = require('../db');
const store = require('../entriesStore');
const { dropUserSchema } = require('../userSchema');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const theme = require('../theme');
const {
  ValidationError, isValidDate, today, validateGoal, parseId, parseDays,
} = require('../validation');

const router = express.Router();
router.use(requireAuth, requireAdmin);

async function findUser(id) {
  const { rows } = await db.query(
    'SELECT id, username, is_admin, daily_goal, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

router.get('/users', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, is_admin, daily_goal, created_at FROM users ORDER BY id'
    );
    const users = await Promise.all(
      rows.map(async (u) => ({ ...u, ...(await store.stats(u.id)) }))
    );
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await findUser(parseId(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    const date = req.query.date === undefined ? today() : req.query.date;
    if (!isValidDate(date)) throw new ValidationError('Date must be YYYY-MM-DD');
    const [day, summary, stats] = await Promise.all([
      store.listForDate(user.id, date),
      store.summary(user.id, parseDays(req.query.days), date),
      store.stats(user.id),
    ]);
    return res.json({ user: { ...user, ...stats }, ...day, summary });
  } catch (err) {
    return next(err);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const body = req.body || {};
    const sets = [];
    const params = [];
    if (body.daily_goal !== undefined) {
      params.push(validateGoal(body.daily_goal));
      sets.push(`daily_goal = $${params.length}`);
    }
    if (body.is_admin !== undefined) {
      if (typeof body.is_admin !== 'boolean') throw new ValidationError('is_admin must be boolean');
      if (id === req.user.id && !body.is_admin) {
        throw new ValidationError('You cannot remove your own admin access');
      }
      params.push(body.is_admin);
      sets.push(`is_admin = $${params.length}`);
    }
    if (!sets.length) throw new ValidationError('Nothing to update');
    params.push(id);
    const { rows } = await db.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}
       RETURNING id, username, is_admin, daily_goal, created_at`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === req.user.id) throw new ValidationError('You cannot delete your own account');
    const deleted = await db.withTransaction(async (client) => {
      const { rowCount } = await client.query('DELETE FROM users WHERE id = $1', [id]);
      if (rowCount) await dropUserSchema(client, id);
      return rowCount > 0;
    });
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

router.put('/theme', async (req, res, next) => {
  try {
    res.json({ theme: await theme.saveTheme(theme.validateTheme(req.body)) });
  } catch (err) {
    next(err);
  }
});

router.delete('/theme', async (req, res, next) => {
  try {
    res.json({ theme: await theme.resetTheme() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
