const { Pool } = require('pg');

// Support both DATABASE_URL (Vercel/Prisma) and individual env vars (local dev)
let poolConfig;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL if available (Vercel/Prisma Postgres)
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    ssl: process.env.DATABASE_URL.includes('sslmode=require') 
      ? { rejectUnauthorized: false } 
      : false
  };
} else {
  // Fallback to individual env vars for local development
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
}

const pool = new Pool(poolConfig);

// Test the connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  // In serverless environments, DO NOT call process.exit()
  // The function will handle errors gracefully through Express error handlers
  // process.exit() kills the entire serverless function instance
});

// Graceful shutdown (only relevant for long-running servers, not serverless)
// In serverless, Vercel manages the lifecycle, so we don't need SIGINT handlers
if (process.env.NODE_ENV !== 'production' || require.main === module) {
  process.on('SIGINT', () => {
    pool.end();
    console.log('Database pool has ended');
    process.exit(0);
  });
}

module.exports = pool;