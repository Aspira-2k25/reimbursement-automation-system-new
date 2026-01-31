// Prisma Client instance
// Use a singleton pattern to reuse the same instance across your app
const { PrismaClient } = require('@prisma/client');

// Create a single instance
const prisma = new PrismaClient({
  // Log queries in development, errors only in production
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

// Handle graceful shutdown (for long-running processes)
if (process.env.NODE_ENV !== 'production' || require.main === module) {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

module.exports = prisma;
