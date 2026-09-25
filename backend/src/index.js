const express = require('express');
const app = express();
const pool = require('./db/pool');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}


app.use(express.json());
const path = require('path');
app.use(express.static(path.join(__dirname, '../../frontend')));


app.get('/api/test', (req, res) => {
	res.json({message: `Backend is working!`});
});

app.get('/api/lots', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lots');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// Single lot lookup
app.get('/api/lots/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lots WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Admin opens a lot
app.post('/api/lots/:id/open', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE lots SET is_open = true WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Admin closes a lot
app.post('/api/lots/:id/close', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE lots SET is_open = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Sensor updates occupancy for their lot
app.post('/api/lots/:id/occupancy', requireAuth, async (req, res) => {
  const { occupancy } = req.body;

  if (req.user.role !== 'sensor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Sensor access required' });
  }

  if (occupancy === undefined) {
    return res.status(400).json({ error: 'occupancy value required' });
  }

  try {
    const result = await pool.query(
      'UPDATE lots SET occupancy = $1 WHERE id = $2 RETURNING *',
      [occupancy, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Admin: list users
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role, lot_id FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Admin: create user
app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, role, lot_id } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role, lot_id) VALUES ($1, $2, $3, $4) RETURNING id, username, role, lot_id',
      [username, hash, role || 'guest', lot_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Admin: delete user
app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

app.post('/api/login', async (req, res) => {
  const { username, password} = req.body;

  if (!username || !password){
    return res.status(400).json({error: 'Username and password required'});
    }
  try{
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  
    if(result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password'});
        }
    
    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches){
      return res.status(401).json({error: 'Invalid username or password'});
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      {expiresIn: '8h'}

    );
    
    res.json({token, role: user.role, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'Something went wrong'});
  }
});
