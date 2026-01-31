const { Pool } = require('pg');

// Support multiple database URL formats:
// 1. DATABASE_URL (Prisma standard / local dev)
// 2. DB_POSTGRES_URL (Prisma Postgres on Vercel - direct connection)
// 3. POSTGRES_URL (Vercel Postgres default)
// 4. POSTGRES_PRISMA_URL (Vercel Postgres with Prisma pooling)
// 5. POSTGRES_URL_NON_POOLING (Vercel Postgres without pooling)
// 6. Individual DB_HOST/DB_NAME/DB_USER env vars (local development fallback)
//
// NOTE: DB_PRISMA_DATABASE_URL uses "prisma+postgres://" protocol which is for 
// Prisma Accelerate only (not compatible with pg Pool). Use DB_POSTGRES_URL instead.

// Get the connection string from available environment variables
const getDatabaseUrl = () => {
  // Priority order for pg Pool (needs postgres:// protocol, NOT prisma+postgres://):
  const candidates = [
    process.env.POSTGRES_URL,
    process.env.DB_POSTGRES_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL
  ];

  // Find the first valid Postgres connection string (starts with postgres:// or postgresql://)
  // We MUST skip 'prisma+postgres://' as it is not supported by the 'pg' library
  const validUrl = candidates.find(url =>
    url && (url.startsWith('postgres://') || url.startsWith('postgresql://'))
  );

  return validUrl || null;
};

let poolConfig;
let pool = null;
const connectionString = getDatabaseUrl();

// Log which environment variable is being used (helpful for debugging)
if (connectionString) {
  const varName = process.env.DATABASE_URL ? 'DATABASE_URL'
    : process.env.DB_POSTGRES_URL ? 'DB_POSTGRES_URL'
      : process.env.POSTGRES_URL ? 'POSTGRES_URL'
        : process.env.POSTGRES_PRISMA_URL ? 'POSTGRES_PRISMA_URL'
          : 'POSTGRES_URL_NON_POOLING';
  console.log(`✅ Using PostgreSQL connection from ${varName}`);
}

// Only create pool if we have database configuration
// This prevents crashes when DATABASE_URL is missing in serverless
if (connectionString) {
  // Use connection string if available (Vercel/Prisma Postgres)
  try {
    poolConfig = {
      connectionString: connectionString,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      ssl: connectionString.includes('sslmode=require') || connectionString.includes('ssl=true')
        ? { rejectUnauthorized: false }
        : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false)
    };
    pool = new Pool(poolConfig);
  } catch (error) {
    console.error('❌ Failed to create PostgreSQL pool:', error.message);
    // Don't crash - pool will be null and routes will handle errors
  }
} else if (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER) {
  // Fallback to individual env vars for local development
  try {
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
    pool = new Pool(poolConfig);
  } catch (error) {
    console.error('❌ Failed to create PostgreSQL pool:', error.message);
    // Don't crash - pool will be null and routes will handle errors
  }
} else {
  console.warn('⚠️ No PostgreSQL configuration found.');
  console.warn('   Required: DATABASE_URL, POSTGRES_PRISMA_URL, POSTGRES_URL, or DB_* environment variables.');
  console.warn('   If using Vercel Postgres, check that environment variables are properly configured in Vercel dashboard.');
  // pool remains null - routes will need to handle this
}

// Only set up event handlers if pool was created
if (pool) {
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
}

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