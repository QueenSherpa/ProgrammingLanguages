# Calorie Counter

A multi-user daily calorie tracker.

**Stack:** PostgreSQL 16 · Node.js 22 / Express · plain HTML, CSS and JavaScript served by nginx · Docker Compose · GitHub Actions CI

## Features

- **Personal logins:** every user signs up with a unique username. Passwords are hashed with bcrypt, and sessions use JWTs.
- **A database per user:** registering creates a dedicated Postgres schema (`user_<id>`) that holds that user's food log, isolated from everyone else.
- **Daily tracking:** log foods by meal, edit or delete entries, move between days, set a daily goal, and see a progress ring plus a 7-day chart.
- **Admin console** (`/admin`):
  - See every user with today's total, entry count, and last activity
  - Open any user's day-by-day log and 14-day history
  - Change a user's goal, grant or revoke admin, or delete a user (this also drops their schema)
  - **Appearance editor:** change the app name, colors, font and corner radius, preview live, and save for everyone

## Quick start

```bash
cd "Calorie Counter"
cp .env.example .env      # then edit the passwords and JWT_SECRET
docker compose up --build
```

Open http://localhost:8080 and sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env`. Without a `.env` file the defaults are `admin` / `admin12345`, so change them for any real use.

The admin account is created or promoted automatically when the backend starts.

## Layout

```
Calorie Counter/
├── docker-compose.yml     db + backend + frontend (nginx)
├── backend/               Express API, migrations, Jest + Supertest tests
│   ├── src/routes/        auth, entries, admin, theme
│   ├── src/userSchema.js  per-user schema creation and teardown
│   └── tests/
└── frontend/              static site + nginx reverse proxy for /api
    └── public/            index (login), dashboard, admin
```

## API overview

| Method | Path | Who |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | anyone |
| GET | `/api/auth/me` | signed in |
| GET/POST | `/api/entries?date=YYYY-MM-DD` | signed in |
| PUT/DELETE | `/api/entries/:id` | signed in |
| GET | `/api/entries/summary?days=7&end=YYYY-MM-DD` | signed in |
| PUT | `/api/me/goal` | signed in |
| GET | `/api/theme` | anyone |
| GET | `/api/admin/users`, `/api/admin/users/:id` | admin |
| PATCH/DELETE | `/api/admin/users/:id` | admin |
| PUT/DELETE | `/api/admin/theme` | admin |

## Tests and CI

`.github/workflows/calorie-counter.yml` runs on every push or PR that touches this folder:

1. Backend tests (Jest + Supertest) against a Postgres 16 service container
2. Backend Docker image build
3. Frontend script syntax check and image build
4. A full-stack smoke test: `docker compose up`, then register, log food, and check admin through nginx

Running the backend tests locally:

```bash
docker run -d --name cc-test-pg -e POSTGRES_USER=calorie -e POSTGRES_PASSWORD=calorie \
  -e POSTGRES_DB=calorie_test -p 55432:5432 postgres:16-alpine
cd "Calorie Counter/backend" && npm ci
DATABASE_URL=postgres://calorie:calorie@localhost:55432/calorie_test npm test
```
