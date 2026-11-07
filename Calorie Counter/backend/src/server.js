const app = require('./app');
const config = require('./config');
const { migrate, ensureAdmin } = require('./migrate');

async function start(retries = 10) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await migrate();
      await ensureAdmin();
      break;
    } catch (err) {
      if (attempt >= retries) throw err;
      console.log(`Database not ready (attempt ${attempt}/${retries}), retrying...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  app.listen(config.port, () => console.log(`API listening on port ${config.port}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
