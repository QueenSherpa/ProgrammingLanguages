const { app, db, request, resetDb, register, auth } = require('./helpers');

beforeEach(resetDb);
afterAll(() => db.pool.end());

const DAY = '2026-03-15';

describe('food entries', () => {
  test('add, list, update and delete entries for a day', async () => {
    const { token } = await register('dana');

    const a = await request(app).post('/api/entries').set(auth(token))
      .send({ food: 'Oatmeal', calories: 300, meal: 'breakfast', date: DAY });
    expect(a.status).toBe(201);
    expect(a.body.entry).toMatchObject({ food: 'Oatmeal', calories: 300, meal: 'breakfast', date: DAY });

    await request(app).post('/api/entries').set(auth(token))
      .send({ food: 'Salad', calories: 450, meal: 'lunch', date: DAY });

    let day = await request(app).get(`/api/entries?date=${DAY}`).set(auth(token));
    expect(day.status).toBe(200);
    expect(day.body.entries).toHaveLength(2);
    expect(day.body.total).toBe(750);
    expect(day.body.goal).toBe(2000);

    const upd = await request(app).put(`/api/entries/${a.body.entry.id}`).set(auth(token))
      .send({ calories: 350 });
    expect(upd.status).toBe(200);
    expect(upd.body.entry.calories).toBe(350);

    const del = await request(app).delete(`/api/entries/${a.body.entry.id}`).set(auth(token));
    expect(del.status).toBe(204);

    day = await request(app).get(`/api/entries?date=${DAY}`).set(auth(token));
    expect(day.body.entries).toHaveLength(1);
    expect(day.body.total).toBe(450);
  });

  test('defaults to today and the snack meal', async () => {
    const { token } = await register('erin');
    const res = await request(app).post('/api/entries').set(auth(token))
      .send({ food: 'Apple', calories: 95 });
    expect(res.status).toBe(201);
    expect(res.body.entry.meal).toBe('snack');
    expect(res.body.entry.date).toBe(new Date().toISOString().slice(0, 10));
  });

  test.each([
    [{ food: '', calories: 100 }],
    [{ food: 'Pizza', calories: -5 }],
    [{ food: 'Pizza', calories: 12.5 }],
    [{ food: 'Pizza', calories: 'lots' }],
    [{ food: 'Pizza', calories: 100, meal: 'brunch' }],
    [{ food: 'Pizza', calories: 100, date: '2026-02-30' }],
  ])('rejects invalid entry %j', async (body) => {
    const { token } = await register('frank');
    const res = await request(app).post('/api/entries').set(auth(token)).send(body);
    expect(res.status).toBe(400);
  });

  test("users cannot see or modify each other's entries", async () => {
    const u1 = await register('gina');
    const u2 = await register('hank');
    const e = await request(app).post('/api/entries').set(auth(u1.token))
      .send({ food: 'Toast', calories: 120, date: DAY });

    const other = await request(app).get(`/api/entries?date=${DAY}`).set(auth(u2.token));
    expect(other.body.entries).toHaveLength(0);

    const del = await request(app).delete(`/api/entries/${e.body.entry.id}`).set(auth(u2.token));
    expect(del.status).toBe(404);

    const mine = await request(app).get(`/api/entries?date=${DAY}`).set(auth(u1.token));
    expect(mine.body.entries).toHaveLength(1);
  });

  test('summary returns zero-filled daily totals', async () => {
    const { token } = await register('ivy');
    await request(app).post('/api/entries').set(auth(token))
      .send({ food: 'A', calories: 100, date: '2026-03-13' });
    await request(app).post('/api/entries').set(auth(token))
      .send({ food: 'B', calories: 200, date: DAY });
    await request(app).post('/api/entries').set(auth(token))
      .send({ food: 'C', calories: 50, date: DAY });

    const res = await request(app).get(`/api/entries/summary?days=3&end=${DAY}`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.days).toEqual([
      { date: '2026-03-13', total: 100 },
      { date: '2026-03-14', total: 0 },
      { date: '2026-03-15', total: 250 },
    ]);
  });

  test('users can change their daily goal', async () => {
    const { token } = await register('jack');
    const bad = await request(app).put('/api/me/goal').set(auth(token)).send({ daily_goal: 10 });
    expect(bad.status).toBe(400);
    const ok = await request(app).put('/api/me/goal').set(auth(token)).send({ daily_goal: 1800 });
    expect(ok.status).toBe(200);
    const day = await request(app).get('/api/entries').set(auth(token));
    expect(day.body.goal).toBe(1800);
  });

  test('entries require authentication', async () => {
    expect((await request(app).get('/api/entries')).status).toBe(401);
    expect((await request(app).post('/api/entries').send({ food: 'x', calories: 1 })).status).toBe(401);
  });
});
