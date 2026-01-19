# Creating Users via Postman

This guide shows you how to create users in your system using Postman (or any HTTP client).

## Prerequisites

1. **Postman installed** (or use any HTTP client like curl, Insomnia, etc.)
2. **Backend server running** (locally or deployed on Vercel)
3. **Database configured** with Prisma migrations applied

## API Endpoints

You have **two endpoints** for creating users:

### 1. `/api/auth/register` - Register with Auto-Login
- Creates a new user AND automatically logs them in
- Returns a JWT token
- Use this for user self-registration

### 2. `/api/auth/create-user` - Create User Only
- Creates a new user without logging them in
- Returns user data only (no token)
- Use this for admin creating users

## Step-by-Step Guide

### Option 1: Using `/api/auth/register` (Recommended for Testing)

1. **Open Postman** and create a new request

2. **Set Request Type**: `POST`

3. **Set URL**:
   - Local: `http://localhost:5000/api/auth/register`
   - Production: `https://your-app.vercel.app/api/auth/register`

4. **Set Headers**:
   ```
   Content-Type: application/json
   ```

5. **Set Body** (select "raw" and "JSON"):
   ```json
   {
     "username": "john_doe",
     "name": "John Doe",
     "email": "john.doe@example.com",
     "password": "securePassword123",
     "department": "IT",
     "role": "Faculty",
     "employee_id": "EMP001"
   }
   ```

6. **Required Fields**:
   - `username` (required) - Unique username
   - `name` (required) - Full name
   - `password` (required) - Minimum 6 characters

7. **Optional Fields**:
   - `email` - Must be valid email format if provided
   - `department` - Department name
   - `role` - Defaults to "Faculty" if not provided. Options: "Faculty", "HOD", "coordinator", "Principal"
   - `employee_id` - Employee ID

8. **Send Request** - You should get a response like:
   ```json
   {
     "message": "User created successfully",
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {
       "id": 1,
       "username": "john_doe",
       "name": "John Doe",
       "email": "john.doe@example.com",
       "department": "IT",
       "role": "Faculty",
       "employee_id": "EMP001",
       "is_active": true,
       "created_at": "2024-01-20T10:30:00.000Z"
     }
   }
   ```

### Option 2: Using `/api/auth/create-user`

Follow the same steps as above, but use:
- **URL**: `http://localhost:5000/api/auth/create-user`
- **Response**: Will NOT include a token (user is created but not logged in)

## Example Requests

### Example 1: Create Faculty Member
```json
{
  "username": "alice_smith",
  "name": "Alice Smith",
  "email": "alice.smith@apsit.edu.in",
  "password": "alice123456",
  "department": "Computer Science",
  "role": "Faculty",
  "employee_id": "CS001"
}
```

### Example 2: Create HOD
```json
{
  "username": "bob_jones",
  "name": "Bob Jones",
  "email": "bob.jones@apsit.edu.in",
  "password": "bob123456",
  "department": "IT",
  "role": "HOD",
  "employee_id": "IT001"
}
```

### Example 3: Create Coordinator
```json
{
  "username": "carol_williams",
  "name": "Carol Williams",
  "email": "carol.williams@apsit.edu.in",
  "password": "carol123456",
  "department": "IT",
  "role": "coordinator",
  "employee_id": "IT002"
}
```

### Example 4: Create Principal
```json
{
  "username": "david_brown",
  "name": "David Brown",
  "email": "david.brown@apsit.edu.in",
  "password": "david123456",
  "department": "Administration",
  "role": "Principal",
  "employee_id": "ADM001"
}
```

### Example 5: Minimal Request (Only Required Fields)
```json
{
  "username": "minimal_user",
  "name": "Minimal User",
  "password": "password123"
}
```

## Response Codes

- **201 Created**: User created successfully
- **400 Bad Request**: Missing required fields or invalid data
- **409 Conflict**: Username or email already exists
- **500 Internal Server Error**: Server error

## Error Examples

### Missing Required Field
```json
{
  "error": "Validation failed",
  "details": [
    "Username is required",
    "Password must be at least 6 characters long"
  ]
}
```

### Username Already Exists
```json
{
  "error": "User with this username already exists"
}
```

### Email Already Exists
```json
{
  "error": "User with this email already exists"
}
```

### Invalid Email Format
```json
{
  "error": "Invalid email format"
}
```

## Testing with cURL

If you prefer command line:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123456",
    "department": "IT",
    "role": "Faculty"
  }'
```

## Security Notes

1. **Passwords are hashed** using bcrypt before storage
2. **Never send passwords** in GET requests
3. **Use HTTPS** in production
4. **Validate input** on both client and server side
5. **Consider adding rate limiting** to prevent abuse

## Verifying Created Users

After creating a user, you can verify it was created:

1. **Login endpoint**: `POST /api/auth/login`
   ```json
   {
     "username": "john_doe",
     "password": "securePassword123"
   }
   ```

2. **Get all users**: `GET /api/auth/staff` (requires authentication token)

3. **Prisma Studio** (local development):
   ```bash
   npm run prisma:studio
   ```
   Opens GUI at `http://localhost:5555`

## Next Steps

1. Create users via Postman
2. Test login with created users
3. Verify users appear in your database
4. Update user roles/permissions as needed
