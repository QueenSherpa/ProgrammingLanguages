// Shared rendering for the progress ring, the weekly bars and the meal list.
const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' };
const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

function renderRing({ total, goal }, ids = {}) {
  const fill = document.getElementById(ids.fill || 'ring-fill');
  const ratio = goal > 0 ? total / goal : 0;
  fill.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
  fill.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - Math.min(ratio, 1))}`;
  fill.classList.toggle('over', total > goal);
  document.getElementById(ids.total || 'total').textContent = total.toLocaleString();
  document.getElementById(ids.goal || 'goal').textContent = goal.toLocaleString();
  const remaining = document.getElementById(ids.remaining || 'remaining');
  if (remaining) {
    const diff = goal - total;
    remaining.textContent = diff >= 0
      ? `${diff.toLocaleString()} kcal remaining`
      : `${Math.abs(diff).toLocaleString()} kcal over goal`;
    remaining.classList.toggle('over', diff < 0);
  }
}

function renderBars(container, days, goal, { selected, onSelect } = {}) {
  container.replaceChildren();
  const max = Math.max(goal, ...days.map((d) => d.total), 1);
  const goalLine = el('div', { class: 'goal-line', style: `--r: ${goal / max}` },
    el('span', {}, `Goal ${goal.toLocaleString()}`));
  container.append(goalLine);
  for (const d of days) {
    const pct = (d.total / max) * 100;
    const label = new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
    const bar = el('button', {
      type: 'button',
      class: `bar${d.total > goal ? ' over' : ''}${d.date === selected ? ' selected' : ''}`,
      title: `${prettyDate(d.date)}: ${d.total.toLocaleString()} kcal`,
      'aria-label': `${prettyDate(d.date)}: ${d.total} kcal`,
      onclick: onSelect ? () => onSelect(d.date) : undefined,
    },
    el('span', { class: 'bar-track' },
      el('span', { class: 'bar-fill', style: `height: ${pct}%` }),
      el('span', { class: 'bar-value', style: `bottom: ${pct}%` }, d.total ? d.total.toLocaleString() : '')),
    el('span', { class: 'bar-label' }, label));
    container.append(bar);
  }
}

function renderMeals(container, entries, { onEdit, onDelete } = {}) {
  container.replaceChildren();
  if (!entries.length) {
    container.append(el('p', { class: 'empty muted' }, 'Nothing logged for this day yet.'));
    return;
  }
  for (const meal of MEAL_ORDER) {
    const items = entries.filter((e) => e.meal === meal);
    if (!items.length) continue;
    const subtotal = items.reduce((s, e) => s + e.calories, 0);
    const list = el('ul', { class: 'entry-list' });
    for (const entry of items) {
      list.append(el('li', {},
        el('span', { class: 'entry-food' }, entry.food),
        el('span', { class: 'entry-cal' }, `${entry.calories.toLocaleString()} kcal`),
        onEdit || onDelete
          ? el('span', { class: 'entry-actions' },
            onEdit ? el('button', { class: 'btn ghost small', type: 'button', onclick: () => onEdit(entry) }, 'Edit') : null,
            onDelete ? el('button', { class: 'btn ghost small danger', type: 'button', onclick: () => onDelete(entry) }, 'Delete') : null)
          : null));
    }
    container.append(el('div', { class: 'meal' },
      el('div', { class: 'meal-head' },
        el('h4', {}, MEAL_LABELS[meal]),
        el('span', { class: 'muted' }, `${subtotal.toLocaleString()} kcal`)),
      list));
  }
}
