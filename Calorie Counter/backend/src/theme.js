// The app's look is stored as a single JSON document that admins can edit and
// the frontend applies as CSS custom properties.
const db = require('./db');
const { ValidationError } = require('./validation');

const DEFAULT_THEME = Object.freeze({
  appName: 'Calorie Counter',
  primary: '#2f855a',
  accent: '#dd6b20',
  background: '#f7faf7',
  surface: '#ffffff',
  text: '#1a202c',
  font: 'system',
  radius: 12,
});

const FONTS = ['system', 'serif', 'rounded', 'mono'];
const COLOR_KEYS = ['primary', 'accent', 'background', 'surface', 'text'];
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function validateTheme(input = {}) {
  const out = {};
  for (const key of Object.keys(input)) {
    if (!(key in DEFAULT_THEME)) throw new ValidationError(`Unknown theme setting: ${key}`);
  }
  for (const key of COLOR_KEYS) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'string' || !COLOR_RE.test(input[key])) {
      throw new ValidationError(`${key} must be a hex color like #1a2b3c`);
    }
    out[key] = input[key].toLowerCase();
  }
  if (input.appName !== undefined) {
    const name = typeof input.appName === 'string' ? input.appName.trim() : '';
    if (!name || name.length > 40) throw new ValidationError('appName must be 1-40 characters');
    out.appName = name;
  }
  if (input.font !== undefined) {
    if (!FONTS.includes(input.font)) throw new ValidationError(`font must be one of: ${FONTS.join(', ')}`);
    out.font = input.font;
  }
  if (input.radius !== undefined) {
    const r = Number(input.radius);
    if (!Number.isInteger(r) || r < 0 || r > 24) throw new ValidationError('radius must be 0-24');
    out.radius = r;
  }
  return out;
}

async function getTheme() {
  const { rows } = await db.query("SELECT value FROM app_settings WHERE key = 'theme'");
  return { ...DEFAULT_THEME, ...(rows[0] ? rows[0].value : {}) };
}

async function saveTheme(changes) {
  const theme = { ...(await getTheme()), ...changes };
  await db.query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ('theme', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(theme)]
  );
  return theme;
}

async function resetTheme() {
  await db.query("DELETE FROM app_settings WHERE key = 'theme'");
  return { ...DEFAULT_THEME };
}

module.exports = { DEFAULT_THEME, FONTS, validateTheme, getTheme, saveTheme, resetTheme };
