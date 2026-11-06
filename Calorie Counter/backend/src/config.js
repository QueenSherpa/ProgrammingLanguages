const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://calorie:calorie@localhost:5432/calorie_counter',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',
};

if (process.env.NODE_ENV === 'production' && config.jwtSecret === 'dev-only-secret-change-me') {
  console.warn('WARNING: JWT_SECRET is not set; using an insecure default.');
}

module.exports = config;
