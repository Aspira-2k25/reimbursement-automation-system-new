# 🚀 DEPLOYMENT GUIDE

**Status:** ✅ Production Ready | **Date:** January 2025

---

## ⚡ QUICK STATUS

```
✅ Zero runtime errors
✅ All code verified
✅ Security configured
✅ Ready for Vercel deployment
```

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### Environment Variables - Backend

Set these in **Vercel Backend Environment Variables:**

```
JWT_SECRET=<generate-strong-random-key-32-chars>
NODE_ENV=production
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
DB_POSTGRES_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
DB_PRISMA_DATABASE_URL=prisma+postgresql://<token>@<region>.pooler.supabase.com/<database>?schema=public
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_SECRET_KEY=<your-cloudinary-secret-key>
FRONTEND_URL=https://your-frontend-domain.vercel.app
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
```

### Environment Variables - Frontend

Set these in **Vercel Frontend Environment Variables:**

```
VITE_API_BASE_URL=https://your-backend-api-domain.vercel.app/api
VITE_GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
```

### Database Setup

- [ ] PostgreSQL database created
- [ ] MongoDB cluster created
- [ ] Credentials saved safely
- [ ] Connection strings verified
- [ ] Run Prisma migrations: `prisma migrate deploy`

### Third-Party Services

- [ ] Cloudinary account configured with credentials
- [ ] Google OAuth client ID created
- [ ] Google OAuth redirect URIs set to production domain

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### Step 1: Deploy Backend to Vercel

```bash
# 1. Create Vercel project
# Go to vercel.com → New Project → Import backend folder

# 2. Configure environment variables in Vercel dashboard
# Add all variables from "Environment Variables - Backend" above

# 3. Set build command: npm install && npm start
# Build settings should be auto-detected

# 4. Deploy and get backend URL (e.g., api.example.vercel.app)
```

### Step 2: Deploy Frontend to Vercel

```bash
# 1. Create Vercel project for frontend
# Go to vercel.com → New Project → Import frontend folder

# 2. Update VITE_API_BASE_URL in environment variables
# Use the backend URL from Step 1
# Example: https://your-backend-api.vercel.app/api

# 3. Set build command: npm run build
# Framework preset: Vite

# 4. Deploy
```

### Step 3: Verify Production Deployment

- [ ] Backend health check: `GET /` returns status
- [ ] Login endpoint works: `POST /api/auth/login`
- [ ] Form submission works
- [ ] File uploads to Cloudinary successful
- [ ] Google OAuth login works
- [ ] Frontend loads without CORS errors
- [ ] Mobile responsive (test on 375px width)

---

## 🔧 TROUBLESHOOTING

### "Cannot connect to backend"
**Solution:** Verify `VITE_API_BASE_URL` is set correctly in Vercel frontend environment

### "CORS error"
**Solution:** Update CORS whitelist in `backend/server/server.js` with your production domain

### "Database connection failed"
**Solution:** Check `DATABASE_URL` and `MONGO_URI` are correct in Vercel backend environment

### "File upload fails"
**Solution:** Verify `CLOUDINARY_*` credentials in Vercel backend environment

### "Google OAuth not working"
**Solution:** Check `GOOGLE_CLIENT_ID` and redirect URIs in Google Cloud Console

---

## ✅ POST-DEPLOYMENT VERIFICATION

### API Endpoints Test

```bash
# Test health check
curl https://your-backend-api.vercel.app/

# Test login (replace with real credentials)
curl -X POST https://your-backend-api.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password"}'
```

### Frontend Test

- [ ] Landing page loads
- [ ] Login page loads
- [ ] Can log in successfully
- [ ] Can submit form
- [ ] Can upload files
- [ ] Mobile layout looks good
- [ ] No console errors

### Database Test

- [ ] Can connect to PostgreSQL
- [ ] Can connect to MongoDB
- [ ] Forms saved to MongoDB
- [ ] User data saved to PostgreSQL

---

## 📊 DEPLOYMENT CHECKLIST

| Item | Status |
|------|--------|
| Environment variables set | [ ] |
| Databases ready | [ ] |
| Backend deployed | [ ] |
| Frontend deployed | [ ] |
| API endpoints tested | [ ] |
| Login works | [ ] |
| File uploads work | [ ] |
| Mobile responsive verified | [ ] |
| No CORS errors | [ ] |
| Monitoring enabled | [ ] |

---

## 🚨 CRITICAL BEFORE DEPLOYMENT

⚠️ **Must Configure:**
- Strong JWT_SECRET (32+ random characters)
- Production database URLs
- All Cloudinary credentials
- Google OAuth credentials
- Frontend API URL matches backend

✅ **Vercel Handles Automatically:**
- HTTPS/SSL certificates
- DNS configuration
- Auto-scaling
- Performance optimizations

---

## 📞 SUPPORT

**Need help?**
- Check Vercel logs for detailed error messages
- Verify environment variables are exactly correct (no typos)
- Test database connections from Vercel
- Check CORS whitelist includes production domain

---

**Status:** ✅ Ready to deploy  
**Last Updated:** January 2025
