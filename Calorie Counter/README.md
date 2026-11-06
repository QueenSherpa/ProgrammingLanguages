# Calorie Counter

Multi-user daily calorie tracker built with **Node.js (Express)**, **PostgreSQL** and **Docker**.

> Status: backend API in progress — the web frontend is coming next.

## Backend highlights

- Each user has their own login (bcrypt-hashed password, JWT sessions).
- Each new user gets their own isolated Postgres schema (`user_<id>`) holding their food log.
- Admin accounts can see every user's log, adjust goals, grant/revoke admin, delete users,
  and change the app's look (name, colors, font, corner radius).

## Run the API

```bash
cd "Calorie Counter"
docker compose up --build
# API on http://localhost:3000/api/health
```

## Run the tests

```bash
docker run -d --name cc-test-pg -e POSTGRES_USER=calorie -e POSTGRES_PASSWORD=calorie \
  -e POSTGRES_DB=calorie_test -p 55432:5432 postgres:16-alpine
cd "Calorie Counter/backend"
npm ci
DATABASE_URL=postgres://calorie:calorie@localhost:55432/calorie_test npm test
```
