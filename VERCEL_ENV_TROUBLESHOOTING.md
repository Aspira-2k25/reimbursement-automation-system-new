# Troubleshooting Vercel Environment Variables

## Quick Check

After deploying, visit: `https://your-app.vercel.app/`

You should see:
```json
{
  "ok": true,
  "service": "backend",
  "env": {
    "hasDatabaseUrl": true,    // ✅ Should be true
    "hasMongoUri": true,       // ✅ Should be true
    "hasJwtSecret": true,      // ✅ Should be true
    "isVercel": true,          // ✅ Should be true
    "envVarCount": 4           // ✅ Should be 4+ (number of env vars found)
  }
}
```

## Common Issues

### Issue 1: Variables Added But Not Redeployed

**Symptom:** Variables are in dashboard but `hasDatabaseUrl: false`

**Fix:**
1. Go to Vercel Dashboard → Your Project → **Deployments**
2. Click the **3 dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete
5. Check the health endpoint again

**Important:** Environment variable changes require a redeploy to take effect!

### Issue 2: Variables Added to Wrong Environment

**Symptom:** Variables exist but not accessible

**Fix:**
1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. For each variable, check which environments it's enabled for:
   - ✅ **Production** (for production deployments)
   - ✅ **Preview** (for preview deployments)
   - ✅ **Development** (for local dev with Vercel CLI)

3. Make sure all required variables are enabled for **Production** at minimum

### Issue 3: Variable Name Typos

**Symptom:** Variables exist but not found

**Check:**
- `DATABASE_URL` (not `DATABASE_URI` or `DB_URL`)
- `MONGO_URI` (not `MONGO_URL` or `MONGODB_URI`)
- `JWT_SECRET` (not `JWT_TOKEN` or `SECRET`)
- Case-sensitive! Must match exactly

### Issue 4: Variable Values Have Extra Characters

**Symptom:** Connection strings fail

**Check:**
- No extra spaces before/after the value
- No quotes around the value (Vercel adds quotes automatically)
- Connection strings are complete and valid

**Example:**
```
✅ CORRECT:
DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=require

❌ WRONG:
DATABASE_URL="postgres://user:pass@host:5432/db?sslmode=require"  (extra quotes)
DATABASE_URL= postgres://user:pass@host:5432/db?sslmode=require   (leading space)
```

## Step-by-Step Verification

### Step 1: Verify Variables in Dashboard

1. Go to: https://vercel.com/dashboard
2. Click your project
3. Go to **Settings** → **Environment Variables**
4. Verify these exist:
   - `DATABASE_URL`
   - `MONGO_URI`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN` (optional, defaults to 24h)
   - `NODE_ENV` (optional, but recommended)
   - `CLOUDINARY_*` (if using Cloudinary)

### Step 2: Check Environment Scope

For each variable, verify:
- ✅ Enabled for **Production**
- ✅ Enabled for **Preview** (if you use preview deployments)
- ✅ Enabled for **Development** (if you use Vercel CLI locally)

### Step 3: Redeploy

**Option A: Via Dashboard**
1. Go to **Deployments** tab
2. Click **3 dots** (⋯) on latest deployment
3. Click **Redeploy**

**Option B: Via Git**
```bash
# Make a small change and push
git commit --allow-empty -m "Trigger redeploy for env vars"
git push
```

### Step 4: Test Health Endpoint

After redeploy completes:
```bash
curl https://your-app.vercel.app/
```

Or visit in browser. Check the `env` object in the response.

### Step 5: Check Logs

1. Go to Vercel Dashboard → Your Project → **Logs**
2. Look for:
   - ✅ `✅ Connected to PostgreSQL database` (if DATABASE_URL works)
   - ✅ No `⚠️ No PostgreSQL configuration found` warnings
   - ✅ No `injecting env (0)` messages (should be gone now)

## Debugging Tips

### Check if Variables Are Actually Set

Add this temporary route to your server (remove after debugging):

```javascript
app.get('/debug-env', (req, res) => {
  res.json({
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    MONGO_URI: process.env.MONGO_URI ? 'SET' : 'NOT SET',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    allEnvKeys: Object.keys(process.env).filter(k => 
      k.includes('DATABASE') || 
      k.includes('MONGO') || 
      k.includes('JWT') || 
      k.includes('CLOUDINARY')
    )
  });
});
```

Visit: `https://your-app.vercel.app/debug-env`

**⚠️ Remove this route after debugging for security!**

## Still Not Working?

1. **Double-check variable names** - Copy/paste from your code, don't type manually
2. **Verify connection strings** - Test them locally first
3. **Check Vercel project** - Make sure you're looking at the correct project
4. **Check deployment logs** - Look for any errors during build/deploy
5. **Try redeploying** - Sometimes a fresh deploy helps

## What I Fixed

I've updated your code to:
- ✅ Only load `dotenv` in local development (not in Vercel)
- ✅ Added better environment variable detection in health endpoint
- ✅ Added logging to help debug missing variables

The `[dotenv@17.2.1] injecting env (0)` message should now disappear in production because dotenv won't run in Vercel.
