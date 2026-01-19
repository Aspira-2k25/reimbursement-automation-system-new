# Prisma PostgreSQL Setup on Vercel

This guide explains how to set up Prisma with PostgreSQL on Vercel, create tables, and insert users.

## Prerequisites

1. **PostgreSQL Database**: You need a PostgreSQL database (e.g., from Prisma Data Platform, Vercel Postgres, or any PostgreSQL provider)
2. **DATABASE_URL**: Your connection string should be in the format:
   ```
   postgresql://user:password@host:port/database?sslmode=require
   ```

## Step 1: Install Prisma Dependencies

The dependencies are already added to `package.json`. Install them:

```bash
cd backend/server
npm install
```

This will install:
- `@prisma/client` - Prisma Client for querying the database
- `prisma` - Prisma CLI for migrations and schema management

## Step 2: Set Up Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add `DATABASE_URL` for **Production**, **Preview**, and **Development**:
   ```
   DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
   ```

## Step 3: Generate Prisma Client

After installing dependencies, Prisma Client is automatically generated via the `postinstall` script. You can also run manually:

```bash
npm run prisma:generate
```

## Step 4: Create Database Tables (Migrations)

### Local Development

1. **Create initial migration:**
   ```bash
   npm run prisma:migrate
   ```
   This will:
   - Create a migration file in `prisma/migrations/`
   - Apply the migration to your local database
   - Generate Prisma Client

2. **Run seed to insert initial users:**
   ```bash
   npm run prisma:seed
   ```

### On Vercel (Production)

Vercel automatically runs `prisma generate` during build (via `postinstall` script).

**To apply migrations on Vercel:**

#### Option A: Using Vercel Build Command (Recommended)

Add this to your `vercel.json`:

```json
{
  "buildCommand": "cd backend/server && npm install && npx prisma migrate deploy && npm run build"
}
```

Or if you don't have a build step, add to `package.json`:

```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy"
  }
}
```

#### Option B: Manual Migration via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Run migration:
   ```bash
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

#### Option C: Using Vercel Post-Deploy Hook

Create a script that runs migrations after deployment. However, **Option A is recommended** as it ensures migrations run before the app starts.

## Step 5: Insert Users

### Method 1: Using Seed File (Recommended for Initial Data)

The seed file (`prisma/seed.js`) is already configured. To run it:

**Locally:**
```bash
npm run prisma:seed
```

**On Vercel:**
Add to your build command or run manually after deployment:
```bash
npx prisma db seed
```

### Method 2: Using Prisma Client in Your Code

You can insert users programmatically in your application:

```javascript
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUser() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user = await prisma.staff.create({
    data: {
      username: 'newuser',
      password: hashedPassword,
      email: 'newuser@example.com',
      role: 'Faculty',
      name: 'New User',
      department: 'IT',
      is_active: true,
    },
  });
  
  console.log('User created:', user);
}

createUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Method 3: Using Prisma Studio (Local Development)

```bash
npm run prisma:studio
```

This opens a GUI at `http://localhost:5555` where you can:
- View all tables
- Add/edit/delete records
- Explore relationships

## Step 6: Update Your Code to Use Prisma

Instead of raw SQL queries, use Prisma Client:

### Before (Raw SQL):
```javascript
const pool = require('./config/database');
const result = await pool.query('SELECT * FROM staff WHERE username = $1', [username]);
```

### After (Prisma):
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const staff = await prisma.staff.findUnique({
  where: { username: username }
});
```

## Important Notes for Vercel

1. **Connection Pooling**: Prisma Client handles connection pooling automatically. No need for manual pool management.

2. **Cold Starts**: Prisma Client is generated at build time, so it's ready immediately when your function starts.

3. **Migrations**: Always run `prisma migrate deploy` in production (not `prisma migrate dev`). The `deploy` command applies pending migrations without creating new ones.

4. **Environment Variables**: Make sure `DATABASE_URL` is set in Vercel for all environments (Production, Preview, Development).

5. **Build Command**: If you add migrations to the build process, ensure your `vercel.json` or build command includes:
   ```bash
   prisma generate && prisma migrate deploy
   ```

## Troubleshooting

### "Prisma Client is not generated"
Run: `npm run prisma:generate`

### "Migration failed"
- Check `DATABASE_URL` is correct in Vercel
- Ensure database is accessible from Vercel's IP
- Check migration files in `prisma/migrations/`

### "Table does not exist"
- Run migrations: `npx prisma migrate deploy`
- Check if migrations were applied: `npx prisma migrate status`

### "Connection timeout"
- Verify `DATABASE_URL` includes `?sslmode=require` for secure connections
- Check database firewall allows Vercel IPs

## Quick Reference Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Create and apply migration (dev)
npm run prisma:migrate

# Apply migrations (production)
npm run prisma:migrate:deploy

# Seed database
npm run prisma:seed

# Open Prisma Studio (GUI)
npm run prisma:studio
```

## Next Steps

1. Update your existing database utility functions (`utils/database.js`) to use Prisma Client instead of raw SQL
2. Test locally with `npm run dev`
3. Deploy to Vercel and verify migrations run successfully
4. Check logs in Vercel dashboard to ensure no connection errors
