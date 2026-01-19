# Critical: Set Environment Variables in Vercel

## The Problem

Your logs show: `[dotenv@17.2.1] injecting env (0) from .env`

This means **0 environment variables** are being loaded. Your function is failing because:

1. `DATABASE_URL` is missing → PostgreSQL pool can't initialize
2. `MONGO_URI` is missing → MongoDB routes will fail
3. `JWT_SECRET` is missing → Authentication will fail
4. Other required variables are missing

## The Fix

### Step 1: Go to Vercel Dashboard
1. Open your project: https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add These Variables

Add each variable for **Production**, **Preview**, and **Development**:

#### Required Variables:

```
DATABASE_URL=postgres://9761175d574d445be24ccd68e0c9db14f7785f6458c5232faa438a1b0f6afe83:sk_NMTFxbkZSikPpAltuBrux@db.prisma.io:5432/postgres?sslmode=require
```

```
MONGO_URI=your_mongodb_connection_string_here
```

```
JWT_SECRET=your_secret_key_minimum_32_characters_long
```

```
JWT_EXPIRES_IN=24h
```

```
NODE_ENV=production
```

#### Optional (if using Cloudinary):

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_SECRET_KEY=your_secret_key
```

### Step 3: Redeploy

After adding environment variables:
1. Go to **Deployments** tab
2. Click the **3 dots** (⋯) on the latest deployment
3. Click **Redeploy**

Or push a new commit to trigger a redeploy.

## How to Verify

After redeploying, check:

1. **Health Check:** `GET https://your-app.vercel.app/`
   - Should return JSON with `hasDatabaseUrl: true`

2. **Database Test:** `GET https://your-app.vercel.app/test-db`
   - Should return connection status

3. **Check Logs:** In Vercel dashboard → **Logs** tab
   - Should see: `✅ Connected to PostgreSQL database`
   - Should NOT see: `FUNCTION_INVOCATION_FAILED`

## Important Notes

- **Never commit `.env` files** to Git
- Environment variables in Vercel are **encrypted** and **secure**
- Changes to env vars require a **redeploy** to take effect
- Use different values for Production vs Preview/Development if needed

## Troubleshooting

### Still getting 500 errors?

1. **Verify variables are set:**
   - Check Vercel dashboard → Settings → Environment Variables
   - Make sure they're added to the correct environment (Production/Preview/Development)

2. **Check variable names:**
   - Must be exact: `DATABASE_URL` (not `DATABASE_URI` or `DB_URL`)
   - Case-sensitive!

3. **Check variable values:**
   - No extra spaces or quotes
   - Connection strings should be complete

4. **Redeploy after changes:**
   - Environment variable changes don't apply to existing deployments
   - Must redeploy for changes to take effect

### Still seeing "injecting env (0)"?

This means Vercel isn't finding your environment variables. Check:
- Variables are added in the correct project
- Variables are enabled for the environment you're deploying to
- You've redeployed after adding variables
