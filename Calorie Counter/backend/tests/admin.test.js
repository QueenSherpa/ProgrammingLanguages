const { app, db, request, resetDb, register, createAdmin, auth } = require('./helpers');

beforeEach(resetDb);
afterAll(() => db.pool.end());

describe('admin', () => {
  test('non-admins are forbidden', async () => {
    const { token } = await register('kate');
    expect((await request(app).get('/api/admin/users').set(auth(token))).status).toBe(403);
    expect((await request(app).put('/api/admin/theme').set(auth(token)).send({ primary: '#000000' })).status).toBe(403);
  });

  test('admin can list users with stats and view a user log', async () => {
    const admin = await createAdmin();
    const u = await register('liam');
    await request(app).post('/api/entries').set(auth(u.token))
      .send({ food: 'Bagel', calories: 280, date: '2026-04-01' });

    const list = await request(app).get('/api/admin/users').set(auth(admin.token));
    expect(list.status).toBe(200);
    const liam = list.body.users.find((x) => x.username === 'liam');
    expect(liam).toMatchObject({ entry_count: 1, is_admin: false });

    const detail = await request(app)
      .get(`/api/admin/users/${u.user.id}?date=2026-04-01&days=7`)
      .set(auth(admin.token));
    expect(detail.status).toBe(200);
    expect(detail.body.total).toBe(280);
    expect(detail.body.entries[0].food).toBe('Bagel');
    expect(detail.body.summary).toHaveLength(7);
  });

  test('admin can update goals and roles, but not demote themselves', async () => {
    const admin = await createAdmin();
    const u = await register('mia');

    const res = await request(app).patch(`/api/admin/users/${u.user.id}`).set(auth(admin.token))
      .send({ daily_goal: 2500, is_admin: true });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ daily_goal: 2500, is_admin: true });

    const self = await request(app).patch(`/api/admin/users/${admin.user.id}`).set(auth(admin.token))
      .send({ is_admin: false });
    expect(self.status).toBe(400);
  });

  test('deleting a user removes their account and schema', async () => {
    const admin = await createAdmin();
    const u = await register('noah');
    const del = await request(app).delete(`/api/admin/users/${u.user.id}`).set(auth(admin.token));
    expect(del.status).toBe(204);

    const { rows } = await db.query('SELECT 1 FROM pg_namespace WHERE nspname = $1', [`user_${u.user.id}`]);
    expect(rows).toHaveLength(0);
    expect((await request(app).get('/api/auth/me').set(auth(u.token))).status).toBe(401);

    const self = await request(app).delete(`/api/admin/users/${admin.user.id}`).set(auth(admin.token));
    expect(self.status).toBe(400);
  });

  test('theme is public to read and admin-editable', async () => {
    const admin = await createAdmin();
    const initial = await request(app).get('/api/theme');
    expect(initial.status).toBe(200);
    expect(initial.body.theme.appName).toBe('Calorie Counter');

    const bad = await request(app).put('/api/admin/theme').set(auth(admin.token))
      .send({ primary: 'red' });
    expect(bad.status).toBe(400);
    const unknown = await request(app).put('/api/admin/theme').set(auth(admin.token))
      .send({ backgroundImage: 'url(x)' });
    expect(unknown.status).toBe(400);

    const ok = await request(app).put('/api/admin/theme').set(auth(admin.token))
      .send({ primary: '#123ABC', appName: 'Fuel Log', font: 'rounded', radius: 4 });
    expect(ok.status).toBe(200);
    const after = await request(app).get('/api/theme');
    expect(after.body.theme).toMatchObject({ primary: '#123abc', appName: 'Fuel Log', font: 'rounded', radius: 4 });

    const reset = await request(app).delete('/api/admin/theme').set(auth(admin.token));
    expect(reset.body.theme.appName).toBe('Calorie Counter');
  });
});
