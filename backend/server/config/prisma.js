// Prisma Client instance with optional Accelerate extension for connection pooling
const { PrismaClient } = require('@prisma/client');
const { withAccelerate } = require('@prisma/extension-accelerate');

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['error', 'warn']
    : ['error'],
});

const isAccelerate = (process.env.DB_PRISMA_DATABASE_URL || '').startsWith('prisma+postgres://');

const prisma = isAccelerate ? basePrisma.$extends(withAccelerate()) : basePrisma;

// Handle graceful shutdown
if (process.env.NODE_ENV !== 'production' || require.main === module) {
  process.on('beforeExit', async () => {
    try {
      await basePrisma.$disconnect();
    } catch (_) {}
  });
}

module.exports = prisma;
