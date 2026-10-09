// Prisma Client instance with Accelerate extension for connection pooling
// Use a singleton pattern to reuse the same instance across your app
const { PrismaClient } = require('@prisma/client');
const { withAccelerate } = require('@prisma/extension-accelerate');

// Create a single instance with Accelerate extension
// Accelerate provides connection pooling and caching to reduce cold start times
const prisma = new PrismaClient({
  // Log queries in development, errors only in production
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
}).$extends(withAccelerate());

// Handle graceful shutdown (for long-running processes)
if (process.env.NODE_ENV !== 'production' || require.main === module) {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

module.exports = prisma;
