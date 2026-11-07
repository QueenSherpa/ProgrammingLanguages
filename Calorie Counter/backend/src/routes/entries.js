const express = require('express');
const db = require('../db');
const store = require('../entriesStore');
const { requireAuth } = require('../middleware/auth');
const {
  ValidationError, isValidDate, today, validateEntry, validateGoal, parseId, parseDays,
} = require('../validation');

const router = express.Router();
router.use(requireAuth);

function dateParam(value) {
  if (value === undefined) return today();
  if (!isValidDate(value)) throw new ValidationError('Date must be YYYY-MM-DD');
  return value;
}

router.get('/entries', async (req, res, next) => {
  try {
    const day = await store.listForDate(req.user.id, dateParam(req.query.date));
    res.json({ ...day, goal: req.user.daily_goal });
  } catch (err) {
    next(err);
  }
});

router.get('/entries/summary', async (req, res, next) => {
  try {
    const days = parseDays(req.query.days);
    const rows = await store.summary(req.user.id, days, dateParam(req.query.end));
    res.json({ goal: req.user.daily_goal, days: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/entries', async (req, res, next) => {
  try {
    const entry = await store.create(req.user.id, validateEntry(req.body));
    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
});

router.put('/entries/:id', async (req, res, next) => {
  try {
    const fields = validateEntry(req.body, { partial: true });
    if (!Object.keys(fields).length) throw new ValidationError('Nothing to update');
    const entry = await store.update(req.user.id, parseId(req.params.id), fields);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    return res.json({ entry });
  } catch (err) {
    return next(err);
  }
});

router.delete('/entries/:id', async (req, res, next) => {
  try {
    const removed = await store.remove(req.user.id, parseId(req.params.id));
    if (!removed) return res.status(404).json({ error: 'Entry not found' });
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

router.put('/me/goal', async (req, res, next) => {
  try {
    const goal = validateGoal(req.body && req.body.daily_goal);
    await db.query('UPDATE users SET daily_goal = $1 WHERE id = $2', [goal, req.user.id]);
    res.json({ daily_goal: goal });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
