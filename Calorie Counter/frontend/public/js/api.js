// Shared helpers: API calls, session storage and theme application.
const TOKEN_KEY = 'cc_token';
const USER_KEY = 'cc_user';

const FONT_STACKS = {
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
};

const session = {
  get token() { return localStorage.getItem(TOKEN_KEY); },
  get user() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  },
  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  setUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (session.token) headers.Authorization = `Bearer ${session.token}`;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401 && session.token) {
    session.clear();
    window.location.href = '/';
    throw new Error('Session expired');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

function applyTheme(theme) {
  const root = document.documentElement.style;
  root.setProperty('--primary', theme.primary);
  root.setProperty('--accent', theme.accent);
  root.setProperty('--bg', theme.background);
  root.setProperty('--surface', theme.surface);
  root.setProperty('--text', theme.text);
  root.setProperty('--radius', `${theme.radius}px`);
  root.setProperty('--font', FONT_STACKS[theme.font] || FONT_STACKS.system);
  document.querySelectorAll('[data-app-name]').forEach((el) => { el.textContent = theme.appName; });
  const suffix = document.title.includes('·') ? document.title.split('·')[1].trim() : '';
  document.title = suffix ? `${theme.appName} · ${suffix}` : theme.appName;
}

async function loadTheme() {
  try {
    const { theme } = await api('/theme');
    applyTheme(theme);
    return theme;
  } catch {
    return null;
  }
}

// Tiny DOM builder that never interprets strings as HTML.
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c !== null && c !== undefined) node.append(c instanceof Node ? c : String(c));
  }
  return node;
}

function localDate(d = new Date()) {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

function shiftDate(iso, days) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localDate(d);
}

function prettyDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function showMessage(target, text, kind = 'error') {
  target.textContent = text;
  target.className = `message ${kind}`;
  target.hidden = !text;
}

function requireSession({ admin = false } = {}) {
  const user = session.user;
  if (!session.token || !user) {
    window.location.href = '/';
    return null;
  }
  if (admin && !user.is_admin) {
    window.location.href = '/dashboard';
    return null;
  }
  return user;
}

function wireHeader(user) {
  const name = document.getElementById('current-user');
  if (name) name.textContent = user.username;
  const adminLink = document.getElementById('admin-link');
  if (adminLink) adminLink.hidden = !user.is_admin;
  const logout = document.getElementById('logout');
  if (logout) {
    logout.addEventListener('click', () => {
      session.clear();
      window.location.href = '/';
    });
  }
}
