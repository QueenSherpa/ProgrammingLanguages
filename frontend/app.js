const API_URL = 'http://localhost:3000';
let token = null;
let role = null;

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginPanel = document.getElementById('login-panel');
const userInfo = document.getElementById('user-info');
const adminPanel = document.getElementById('admin-panel');

loginBtn.addEventListener('click', handleLogin);
logoutBtn.addEventListener('click', handleLogout);

async function handleLogin() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const statusEl = document.getElementById('login-status');

  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      statusEl.textContent = data.error || 'Login failed';
      return;
    }

    token = data.token;
    role = data.role;

    document.getElementById('current-username').textContent = data.username;
    document.getElementById('current-role').textContent = data.role;

    loginPanel.style.display = 'none';
    userInfo.style.display = 'block';

    if (role === 'admin') {
      adminPanel.style.display = 'block';
    }

    loadLots();
  } catch (err) {
    statusEl.textContent = 'Something went wrong';
  }
}

function handleLogout() {
  token = null;
  role = null;
  loginPanel.style.display = 'block';
  userInfo.style.display = 'none';
  adminPanel.style.display = 'none';
}

async function loadLots() {
  const response = await fetch(`${API_URL}/api/lots`);
  const lots = await response.json();

  const list = document.getElementById('lots-list');
  list.innerHTML = '';
  lots.forEach(lot => {
    const li = document.createElement('li');
    li.className = lot.is_open ? 'open' : 'closed';
    li.textContent = `${lot.name}: ${lot.occupancy}/${lot.capacity} spaces used (${lot.is_open ? 'Open' : 'Closed'})`;
    list.appendChild(li);
  });

  if (role === 'admin') {
    renderAdminControls(lots);
  }
}

function renderAdminControls(lots) {
  const container = document.getElementById('admin-lots-list');
  container.innerHTML = '';
  lots.forEach(lot => {
    const div = document.createElement('div');
    div.textContent = `${lot.name} `;

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = lot.is_open ? 'Close' : 'Open';
    toggleBtn.addEventListener('click', () => toggleLot(lot.id, lot.is_open));

    div.appendChild(toggleBtn);
    container.appendChild(div);
  });
}

async function toggleLot(id, currentlyOpen) {
  const action = currentlyOpen ? 'close' : 'open';
  await fetch(`${API_URL}/api/lots/${id}/${action}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  loadLots();
}

// Load lots immediately on page load (guests can see availability without logging in)
loadLots();

