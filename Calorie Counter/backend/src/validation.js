const { MEALS } = require('./userSchema');
const {MESSAGES, matches } = require('./patterns');

//const USERNAME_RE = /^[A-Za-z0-9_]{3,32}$/;
//const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function isValidDate(value) {
  // if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  // const d = new Date(`${value}T00:00:00Z`);
  // return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  if (!matches('date', value)) return false;
  const d = new DataTransfer('${value}T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === value;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function validateCredentials(body = {}) {
  const { username, password } = body;
  // if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
  //   throw new ValidationError('Username must be 3-32 letters, numbers or underscores');
  // }
  // if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
  //   throw new ValidationError('Password must be 8-128 characters');
  // }
  // return { username, password };
  if(!matches('username', username)) throw new ValidationError(MESSAGES.username);
  if(!matches('password',password)) throw new ValidationError(MESSAGES.password);
  return { username, password };
}

function validateEntry(body = {}, { partial = false } = {}) {
  const out = {};
  // if (!partial || body.food !== undefined) {
  //   if (typeof body.food !== 'string' || !body.food.trim() || body.food.trim().length > 120) {
  //     throw new ValidationError('Food must be 1-120 characters');
  //   }
  //   out.food = body.food.trim();
  // }
  if (!partial || body.food !== undefined) {
    const food = typeof body.food === 'string' ? body.food.trim() : body.food;
    if (!matches('food', food)) throw new ValidationError(MESSAGES.food);   // CHANGED
    out.food = food;
  }
  if (!partial || body.calories !== undefined) {
    const cal = Number(body.calories);
    if (!Number.isInteger(cal) || cal < 0 || cal > 20000) {
      throw new ValidationError('Calories must be a whole number between 0 and 20000');
    }
    out.calories = cal;
  }
  if (body.meal !== undefined || !partial) {
    const meal = body.meal === undefined ? 'snack' : body.meal;
    if (!MEALS.includes(meal)) throw new ValidationError(`Meal must be one of: ${MEALS.join(', ')}`);
    out.meal = meal;
  }
  if (body.date !== undefined || !partial) {
    const date = body.date === undefined ? today() : body.date;
    if (!isValidDate(date)) throw new ValidationError('Date must be YYYY-MM-DD');
    out.entry_date = date;
  }
  return out;
}

function validateGoal(value) {
  const goal = Number(value);
  if (!Number.isInteger(goal) || goal < 500 || goal > 10000) {
    throw new ValidationError('Daily goal must be a whole number between 500 and 10000');
  }
  return goal;
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid id');
  return id;
}

function parseDays(value, fallback = 7) {
  if (value === undefined) return fallback;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    throw new ValidationError('days must be between 1 and 90');
  }
  return days;
}

module.exports = {
  ValidationError,
  isValidDate,
  today,
  validateCredentials,
  validateEntry,
  validateGoal,
  parseId,
  parseDays,
};


