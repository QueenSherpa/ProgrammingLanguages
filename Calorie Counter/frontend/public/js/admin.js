(function () {
  const me = requireSession({ admin: true });
  if (!me) return;
  wireHeader(me);

  const $ = (id) => document.getElementById(id);
  const state = { users: [], selected: null, date: localDate(), savedTheme: null };

  // ---- Tabs -------------------------------------------------------------
  document.querySelectorAll('.page-tabs .tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.page-tabs .tab').forEach((t) => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.id !== tab.dataset.panel; });
    });
  });

  // ---- Users ------------------------------------------------------------
  function renderStats() {
    const users = state.users;
    const activeToday = users.filter((u) => u.today_total > 0).length;
    const entries = users.reduce((s, u) => s + u.entry_count, 0);
    const avg = activeToday
      ? Math.round(users.reduce((s, u) => s + u.today_total, 0) / activeToday)
      : 0;
    $('stats').replaceChildren(
      ...[
        ['Users', users.length],
        ['Logged today', activeToday],
        ['Avg. today (active)', `${avg.toLocaleString()} kcal`],
        ['Total entries', entries.toLocaleString()],
      ].map(([label, value]) => el('div', { class: 'card stat' },
        el('span', { class: 'muted' }, label), el('strong', {}, value)))
    );
  }

  function renderUsers() {
    const q = $('user-search').value.trim().toLowerCase();
    const rows = state.users
      .filter((u) => !q || u.username.toLowerCase().includes(q))
      .map((u) => {
        const isMe = u.id === me.id;
        return el('tr', { class: state.selected === u.id ? 'selected' : '' },
          el('td', {}, el('button', { class: 'link', type: 'button', onclick: () => openUser(u.id) }, u.username),
            isMe ? el('span', { class: 'muted' }, ' (you)') : null),
          el('td', {}, el('span', { class: `badge${u.is_admin ? '' : ' plain'}` }, u.is_admin ? 'Admin' : 'User')),
          el('td', {}, u.daily_goal.toLocaleString()),
          el('td', { class: u.today_total > u.daily_goal ? 'over' : '' }, u.today_total.toLocaleString()),
          el('td', {}, u.entry_count.toLocaleString()),
          el('td', {}, u.last_entry ? prettyDate(u.last_entry) : '—'),
          el('td', {}, new Date(u.created_at).toLocaleDateString()),
          el('td', { class: 'row-actions' },
            el('button', { class: 'btn ghost small', type: 'button', onclick: () => openUser(u.id) }, 'View'),
            isMe ? null : el('button', {
              class: 'btn ghost small', type: 'button', onclick: () => toggleAdmin(u),
            }, u.is_admin ? 'Revoke admin' : 'Make admin'),
            isMe ? null : el('button', {
              class: 'btn ghost small danger', type: 'button', onclick: () => deleteUser(u),
            }, 'Delete')));
      });
    $('users-body').replaceChildren(...rows);
    if (!rows.length) {
      $('users-body').append(el('tr', {}, el('td', { colspan: 8, class: 'muted empty' }, 'No users found.')));
    }
  }

  async function loadUsers() {
    try {
      const { users } = await api('/admin/users');
      state.users = users;
      renderStats();
      renderUsers();
    } catch (err) {
      showMessage($('users-message'), err.message);
    }
  }

  async function toggleAdmin(u) {
    const verb = u.is_admin ? 'Remove admin access from' : 'Give admin access to';
    if (!window.confirm(`${verb} ${u.username}?`)) return;
    try {
      await api(`/admin/users/${u.id}`, { method: 'PATCH', body: { is_admin: !u.is_admin } });
      loadUsers();
    } catch (err) {
      window.alert(err.message);
    }
  }

  async function deleteUser(u) {
    if (!window.confirm(`Permanently delete ${u.username} and all of their data?`)) return;
    try {
      await api(`/admin/users/${u.id}`, { method: 'DELETE' });
      if (state.selected === u.id) closeUser();
      loadUsers();
    } catch (err) {
      window.alert(err.message);
    }
  }

  // ---- User detail ------------------------------------------------------
  async function openUser(id, date) {
    state.selected = id;
    if (date) state.date = date;
    renderUsers();
    try {
      const data = await api(`/admin/users/${id}?date=${state.date}&days=14`);
      $('user-detail').hidden = false;
      $('detail-title').textContent = `${data.user.username}'s log`;
      const today = localDate();
      $('detail-day').textContent = state.date === today ? 'Today' : prettyDate(state.date);
      $('detail-picker').value = state.date;
      $('detail-next').disabled = state.date >= today;
      $('detail-goal-form').elements.daily_goal.value = data.user.daily_goal;
      renderRing({ total: data.total, goal: data.user.daily_goal });
      renderMeals($('detail-meals'), data.entries);
      renderBars($('detail-bars'), data.summary, data.user.daily_goal, {
        selected: state.date, onSelect: (d) => openUser(id, d),
      });
    } catch (err) {
      window.alert(err.message);
    }
  }

  function closeUser() {
    state.selected = null;
    $('user-detail').hidden = true;
    renderUsers();
  }

  $('detail-close').addEventListener('click', closeUser);
  $('detail-prev').addEventListener('click', () => openUser(state.selected, shiftDate(state.date, -1)));
  $('detail-next').addEventListener('click', () => openUser(state.selected, shiftDate(state.date, 1)));
  $('detail-picker').addEventListener('change', (e) => {
    if (e.target.value) openUser(state.selected, e.target.value > localDate() ? localDate() : e.target.value);
  });
  $('detail-goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api(`/admin/users/${state.selected}`, {
        method: 'PATCH', body: { daily_goal: Number(e.target.elements.daily_goal.value) },
      });
      await loadUsers();
      openUser(state.selected);
    } catch (err) {
      window.alert(err.message);
    }
  });
  $('user-search').addEventListener('input', renderUsers);

  // ---- Theme ------------------------------------------------------------
  const themeForm = $('theme-form');
  const themeMessage = $('theme-message');
  const FIELDS = ['appName', 'primary', 'accent', 'background', 'surface', 'text', 'font', 'radius'];

  function fillThemeForm(theme) {
    for (const f of FIELDS) themeForm.elements[f].value = theme[f];
    $('radius-out').textContent = `${theme.radius}px`;
  }

  function readThemeForm() {
    const t = {};
    for (const f of FIELDS) t[f] = themeForm.elements[f].value;
    t.radius = Number(t.radius);
    t.appName = t.appName.trim() || (state.savedTheme && state.savedTheme.appName) || 'Calorie Counter';
    return t;
  }

  themeForm.addEventListener('input', () => {
    const t = readThemeForm();
    $('radius-out').textContent = `${t.radius}px`;
    applyTheme(t);
    showMessage(themeMessage, '');
  });

  themeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const { theme } = await api('/admin/theme', { method: 'PUT', body: readThemeForm() });
      state.savedTheme = theme;
      fillThemeForm(theme);
      applyTheme(theme);
      showMessage(themeMessage, 'Theme saved for all users.', 'success');
    } catch (err) {
      showMessage(themeMessage, err.message);
    }
  });

  $('theme-revert').addEventListener('click', () => {
    if (!state.savedTheme) return;
    fillThemeForm(state.savedTheme);
    applyTheme(state.savedTheme);
    showMessage(themeMessage, '');
  });

  $('theme-reset').addEventListener('click', async () => {
    if (!window.confirm('Restore the default look for everyone?')) return;
    try {
      const { theme } = await api('/admin/theme', { method: 'DELETE' });
      state.savedTheme = theme;
      fillThemeForm(theme);
      applyTheme(theme);
      showMessage(themeMessage, 'Default theme restored.', 'success');
    } catch (err) {
      showMessage(themeMessage, err.message);
    }
  });

  loadTheme().then((theme) => {
    if (!theme) return;
    state.savedTheme = theme;
    fillThemeForm(theme);
  });
  loadUsers();
})();
