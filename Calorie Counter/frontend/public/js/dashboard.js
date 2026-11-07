(function () {
  const user = requireSession();
  if (!user) return;
  wireHeader(user);
  loadTheme();

  const state = { date: localDate(), editing: null };
  const $ = (id) => document.getElementById(id);
  const entryForm = $('entry-form');
  const goalForm = $('goal-form');
  const entryMessage = $('entry-message');

  function setDate(date) {
    state.date = date;
    refresh();
  }

  function resetForm() {
    state.editing = null;
    entryForm.reset();
    entryForm.elements.meal.value = 'snack';
    $('form-title').textContent = 'Add food';
    $('entry-submit').textContent = 'Add';
    $('entry-cancel').hidden = true;
    showMessage(entryMessage, '');
  }

  function startEdit(entry) {
    state.editing = entry.id;
    entryForm.elements.food.value = entry.food;
    entryForm.elements.calories.value = entry.calories;
    entryForm.elements.meal.value = entry.meal;
    $('form-title').textContent = 'Edit food';
    $('entry-submit').textContent = 'Save';
    $('entry-cancel').hidden = false;
    entryForm.elements.food.focus();
  }

  async function removeEntry(entry) {
    if (!window.confirm(`Delete "${entry.food}"?`)) return;
    try {
      await api(`/entries/${entry.id}`, { method: 'DELETE' });
      if (state.editing === entry.id) resetForm();
      refresh();
    } catch (err) {
      window.alert(err.message);
    }
  }

  async function refresh() {
    const today = localDate();
    $('day-title').textContent = state.date === today ? 'Today' : prettyDate(state.date);
    $('day-picker').value = state.date;
    $('next-day').disabled = state.date >= today;
    try {
      const [day, week] = await Promise.all([
        api(`/entries?date=${state.date}`),
        api(`/entries/summary?days=7&end=${state.date}`),
      ]);
      renderRing(day);
      if (document.activeElement !== goalForm.elements.daily_goal) {
        goalForm.elements.daily_goal.value = day.goal;
      }
      renderMeals($('meals'), day.entries, { onEdit: startEdit, onDelete: removeEntry });
      renderBars($('week'), week.days, week.goal, { selected: state.date, onSelect: setDate });
    } catch (err) {
      showMessage(entryMessage, err.message);
    }
  }

  entryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showMessage(entryMessage, '');
    const body = {
      food: entryForm.elements.food.value,
      calories: Number(entryForm.elements.calories.value),
      meal: entryForm.elements.meal.value,
    };
    try {
      if (state.editing) {
        await api(`/entries/${state.editing}`, { method: 'PUT', body });
      } else {
        await api('/entries', { method: 'POST', body: { ...body, date: state.date } });
      }
      resetForm();
      refresh();
      entryForm.elements.food.focus();
    } catch (err) {
      showMessage(entryMessage, err.message);
    }
  });

  $('entry-cancel').addEventListener('click', resetForm);

  goalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const { daily_goal: goal } = await api('/me/goal', {
        method: 'PUT', body: { daily_goal: Number(goalForm.elements.daily_goal.value) },
      });
      session.setUser({ ...session.user, daily_goal: goal });
      goalForm.elements.daily_goal.blur();
      refresh();
    } catch (err) {
      window.alert(err.message);
    }
  });

  $('prev-day').addEventListener('click', () => setDate(shiftDate(state.date, -1)));
  $('next-day').addEventListener('click', () => setDate(shiftDate(state.date, 1)));
  $('day-picker').addEventListener('change', (e) => {
    if (e.target.value) setDate(e.target.value > localDate() ? localDate() : e.target.value);
  });

  refresh();
})();
