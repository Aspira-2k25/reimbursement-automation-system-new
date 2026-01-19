# Multer Read-Only Filesystem Error Fix

## The Problem

**Error:** `Error: EROFS: read-only file system, mkdir '/var/task/uploads'`

**Root Cause:**
- Multer was configured to use **disk storage** (`multer.diskStorage()`)
- Serverless environments (Vercel, AWS Lambda) have **read-only filesystems**
- Multer tried to create `/var/task/uploads` directory → **FAILED**

## The Fix

**Solution:** Changed Multer to use **memory storage** instead of disk storage

### Files Updated:

1. **`backend/server/middleware/multer.js`**
   - Changed from `multer.diskStorage()` to `multer.memoryStorage()`
   - Files are now stored in memory (RAM) instead of disk

2. **`backend/server/routes/uploadRoutes.js`**
   - Changed from `multer({ dest: 'uploads/' })` to `multer.memoryStorage()`
   - Updated file upload logic to use memory buffers

3. **`backend/server/utils/cloudinary.js`**
   - Added `uploadFile()` helper function
   - Handles both memory buffers (serverless) and file paths (local dev)
   - Converts buffers to data URIs for Cloudinary

4. **`backend/server/routes/formRoutes.js`**
   - Updated to use `uploadFile()` helper instead of direct `file.path`
   - Works with memory buffers from Multer

5. **`backend/server/routes/StudentFormRoutes.js`**
   - Updated to use `uploadFile()` helper instead of direct `file.path`
   - Works with memory buffers from Multer

## How It Works Now

### Before (Disk Storage - ❌ Fails in Serverless):
```javascript
// Tries to write to disk
const upload = multer({ dest: 'uploads/' });
// File saved to: /var/task/uploads/file.jpg
cloudinary.uploader.upload(file.path); // Reads from disk
```

### After (Memory Storage - ✅ Works in Serverless):
```javascript
// Stores file in memory
const upload = multer({ storage: multer.memoryStorage() });
// File stored in: req.file.buffer (RAM)
uploadFile(file); // Reads from memory buffer
```

## Key Changes

### 1. Multer Configuration
```javascript
// OLD (disk storage)
const storage = multer.diskStorage({...});
const upload = multer({ storage: storage });

// NEW (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
```

### 2. File Upload Helper
```javascript
// NEW helper function in cloudinary.js
function uploadFile(file, options) {
  if (file.buffer) {
    // Serverless: use memory buffer
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    return cloudinary.uploader.upload(dataUri, options);
  }
  // Local dev: use file path (backward compatibility)
  return cloudinary.uploader.upload(file.path || file, options);
}
```

### 3. Route Updates
```javascript
// OLD
if (req.files?.nptelResult?.[0]?.path) {
  await cloudinary.uploader.upload(req.files.nptelResult[0].path, {...});
}

// NEW
if (req.files?.nptelResult?.[0]) {
  await uploadFile(req.files.nptelResult[0], {...});
}
```

## Benefits

✅ **Works in serverless** - No filesystem writes needed
✅ **Backward compatible** - Still works in local development
✅ **Faster** - No disk I/O, files stay in memory
✅ **Cleaner** - No temporary files to clean up

## Trade-offs

⚠️ **Memory Usage:**
- Files are stored in RAM during upload
- Large files (10MB+) consume more memory
- Mitigated by file size limits (10MB max)

⚠️ **Timeout Risk:**
- Large files take longer to process
- Vercel has function timeout limits
- Mitigated by Cloudinary's fast upload API

## Verification

After deploying, test file uploads:

1. **Form Submission:** `POST /api/forms/submit`
   - Upload files via form
   - Should upload to Cloudinary successfully

2. **Student Form:** `POST /api/student-forms/submit`
   - Upload files via student form
   - Should upload to Cloudinary successfully

3. **Check Logs:**
   - ✅ No more `EROFS` errors
   - ✅ Files upload successfully
   - ✅ Cloudinary URLs returned

## Understanding Serverless Filesystems

**Why Read-Only?**
- Serverless functions are **ephemeral** - they can be destroyed anytime
- Files written to disk would be **lost** when function terminates
- Read-only filesystem prevents data loss and security issues

**Memory Storage:**
- Files stored in RAM (temporary)
- Processed immediately and uploaded to Cloudinary
- Memory is cleared when function ends
- Perfect for serverless workflows

## Summary

**The Core Lesson:** In serverless, never write to the filesystem. Use memory storage for temporary file handling, then upload directly to cloud storage (Cloudinary, S3, etc.).
