# Connecting Frontend and Backend on Vercel

This guide explains how to connect your frontend and backend deployments on Vercel.

## Prerequisites

- ✅ Frontend deployed on Vercel
- ✅ Backend deployed on Vercel
- ✅ Both projects are in your Vercel dashboard

## Step 1: Get Your Backend URL

1. Go to your **Vercel Dashboard**
2. Open your **backend project**
3. Go to **Deployments** tab
4. Click on the latest deployment
5. Copy the **Production URL** (e.g., `https://your-backend.vercel.app`)

**Important**: Your backend URL should be something like:
```
https://your-backend-project-name.vercel.app
```

## Step 2: Set Frontend Environment Variable

1. Go to your **Vercel Dashboard**
2. Open your **frontend project**
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:

   **Variable Name**: `VITE_API_BASE_URL`
   
   **Value**: `https://your-backend.vercel.app/api`
   
   **Environments**: ✅ Production, ✅ Preview, ✅ Development

   **Example**:
   ```
   VITE_API_BASE_URL=https://reimbursement-backend.vercel.app/api
   ```

5. Click **Save**

## Step 3: Update Backend CORS Configuration

Your backend needs to allow requests from your frontend domain.

1. Go to your **backend project** in Vercel
2. Go to **Settings** → **Environment Variables**
3. Add:

   **Variable Name**: `FRONTEND_URL`
   
   **Value**: `https://your-frontend.vercel.app`
   
   **Environments**: ✅ Production, ✅ Preview, ✅ Development

4. Update `backend/server/server.js` to use this:

```javascript
// Update CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

## Step 4: Redeploy Both Projects

After setting environment variables, you need to redeploy:

### Option A: Via Dashboard
1. Go to **Deployments** tab in each project
2. Click **3 dots** (⋯) on latest deployment
3. Click **Redeploy**

### Option B: Via Git (Recommended)
```bash
# Make a small change and push
git commit --allow-empty -m "Update environment variables"
git push
```

## Step 5: Verify Connection

### Test Backend Health
```bash
curl https://your-backend.vercel.app/
```

Should return:
```json
{
  "ok": true,
  "service": "backend",
  ...
}
```

### Test Frontend → Backend Connection

1. Open your frontend URL: `https://your-frontend.vercel.app`
2. Open browser **Developer Tools** (F12)
3. Go to **Network** tab
4. Try to login or make any API call
5. Check if requests go to your backend URL (not localhost)

## Troubleshooting

### Frontend Still Using Localhost

**Problem**: Frontend is still calling `http://localhost:5000`

**Solution**:
1. Verify `VITE_API_BASE_URL` is set in Vercel
2. Redeploy frontend
3. Clear browser cache
4. Check browser console for the actual API URL being used

### CORS Errors

**Problem**: `Access-Control-Allow-Origin` errors in browser console

**Solution**:
1. Verify `FRONTEND_URL` is set in backend environment variables
2. Update backend CORS configuration (see Step 3)
3. Redeploy backend
4. Check that frontend URL matches exactly (no trailing slash)

### 404 Errors on API Calls

**Problem**: API calls return 404

**Solution**:
1. Verify backend URL is correct (should end with `/api`)
2. Check backend routes are properly configured
3. Verify `vercel.json` routing is correct
4. Check backend logs in Vercel dashboard

### Environment Variables Not Working

**Problem**: Variables not being picked up

**Solution**:
1. Variables must be set **before** deployment
2. Redeploy after adding variables
3. For Vite, variables must start with `VITE_`
4. Check variable names are exact (case-sensitive)

## Quick Reference

### Frontend Environment Variables (Vercel)
```
VITE_API_BASE_URL=https://your-backend.vercel.app/api
```

### Backend Environment Variables (Vercel)
```
DATABASE_URL=your_postgresql_connection_string
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

## Example URLs

**Backend**: `https://reimbursement-backend.vercel.app`
**Frontend**: `https://reimbursement-frontend.vercel.app`

**Frontend Environment Variable**:
```
VITE_API_BASE_URL=https://reimbursement-backend.vercel.app/api
```

**Backend Environment Variable**:
```
FRONTEND_URL=https://reimbursement-frontend.vercel.app
```

## Testing Locally vs Production

### Local Development
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Frontend `.env`: `VITE_API_BASE_URL=http://localhost:5000/api`

### Production (Vercel)
- Frontend: `https://your-frontend.vercel.app`
- Backend: `https://your-backend.vercel.app`
- Frontend Vercel Env: `VITE_API_BASE_URL=https://your-backend.vercel.app/api`

## Next Steps

1. ✅ Set `VITE_API_BASE_URL` in frontend Vercel project
2. ✅ Set `FRONTEND_URL` in backend Vercel project
3. ✅ Update backend CORS configuration
4. ✅ Redeploy both projects
5. ✅ Test the connection
6. ✅ Fix any hardcoded localhost URLs (see below)

## Fixing Hardcoded URLs

Some files may have hardcoded `http://localhost:5000` URLs. These need to be updated to use the API base URL from environment variables.

Files to check:
- `front-end/src/Pages/nptel_form/EditForm.jsx`
- `front-end/src/Pages/nptel_form/ViewEditForm.jsx`
- `front-end/src/Pages/nptel_form/ReimbursementForm.jsx`
- `front-end/src/Pages/nptel_form/StudentForm.jsx`
- `front-end/src/Pages/Dashboard/Hod/pages/RequestStatus.jsx`

Replace hardcoded URLs with:
```javascript
// Instead of:
fetch('http://localhost:5000/api/...')

// Use:
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
fetch(`${API_BASE_URL}/...`)
```
