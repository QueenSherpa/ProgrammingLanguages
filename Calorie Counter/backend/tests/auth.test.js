const { app, db, request, resetDb, register, auth } = require('./helpers');

beforeEach(resetDb);
afterAll(() => db.pool.end());

describe('auth', () => {
  test('register creates a user, a token and a dedicated schema', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ username: 'alice', is_admin: false, daily_goal: 2000 });

    const schema = `user_${res.body.user.id}`;
    const { rows } = await db.query(
      'SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2',
      [schema, 'entries']
    );
    expect(rows).toHaveLength(1);
  });

  test('usernames are unique', async () => {
    await register('alice');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', password: 'different123' });
    expect(res.status).toBe(409);
  });

  test.each([
    [{ username: 'ab', password: 'password123' }],
    [{ username: 'bad name!', password: 'password123' }],
    [{ username: 'alice', password: 'short' }],
    [{}],
  ])('rejects invalid registration %j', async (body) => {
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(400);
  });

  test('login succeeds with correct password and fails otherwise', async () => {
    await register('bob', 'correct-horse42');
    const ok = await request(app)
      .post('/api/auth/login')
      .send({ username: 'bob', password: 'correct-horse42' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ username: 'bob', password: 'wrong-password' });
    expect(bad.status).toBe(401);

    const missing = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'whatever123' });
    expect(missing.status).toBe(401);
  });

  test('/me requires a valid token', async () => {
    const { token } = await register('carol');
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set(auth('garbage'))).status).toBe(401);
    const me = await request(app).get('/api/auth/me').set(auth(token));
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe('carol');
  });

  test('health check reports database status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
