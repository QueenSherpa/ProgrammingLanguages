(function () {
  if (session.token && session.user) {
    window.location.href = session.user.is_admin ? '/admin' : '/dashboard';
    return;
  }
  loadTheme();

  let mode = 'login';
  const form = document.getElementById('auth-form');
  const submit = document.getElementById('auth-submit');
  const message = document.getElementById('auth-message');
  const hint = document.getElementById('auth-hint');
  const password = form.elements.password;

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.mode;
      document.querySelectorAll('.tab').forEach((t) => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
      });
      submit.textContent = mode === 'login' ? 'Sign in' : 'Create account';
      password.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
      hint.hidden = mode === 'login';
      showMessage(message, '');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showMessage(message, '');
    submit.disabled = true;
    try {
      const body = { username: form.elements.username.value.trim(), password: password.value };
      const data = await api(`/auth/${mode}`, { method: 'POST', body });
      session.save(data.token, data.user);
      window.location.href = data.user.is_admin ? '/admin' : '/dashboard';
    } catch (err) {
      showMessage(message, err.message);
    } finally {
      submit.disabled = false;
    }
  });
})();
