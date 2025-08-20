# Admin User Setup Guide

## Overview
This application no longer uses hardcoded credentials. Instead, admin users are created through MongoDB and their credentials are stored securely in the database.

## Setting Up Your Admin Account

### Step 1: Start the Server
Make sure your server is running on port 4800:
```bash
npm run start:all
```

### Step 2: Create Admin User
Run the admin creation script:
```bash
node scripts/create_admin_user.js
```

This script will:
- Create an admin user with email: `pwelby@gmail.com`
- Set the password: `PJW_1236!`
- Store the credentials securely in MongoDB
- Assign the 'admin' role

### Step 3: Log In
1. Click the User icon in the top right corner
2. Select "Admin" from the dropdown
3. Use your credentials:
   - Email: `pwelby@gmail.com`
   - Password: `PJW_1236!`

## How It Works

### Credential Storage
- **MongoDB**: User credentials are stored in the `users` collection with hashed passwords
- **localStorage**: Authentication tokens and user data are cached locally for session persistence
- **JWT**: Secure tokens are used for authentication with 24-hour expiration

### Session Persistence
- Your login session will persist across browser refreshes
- The Admin portal will remember you're logged in
- No need to log in every time you access the Admin panel

### Security Features
- Passwords are hashed using bcrypt with 12 salt rounds
- JWT tokens expire after 24 hours
- Admin creation requires a secret key (configurable via environment variable)

## Environment Variables

You can customize the admin creation secret by setting:
```bash
CLI_SECRET=your-custom-secret
```

## Troubleshooting

### "User already exists" Error
If you get this error, the admin user was already created. You can:
1. Try logging in directly with the Admin portal
2. Check if the user exists in MongoDB
3. Reset the user's password if needed

### Session Not Persisting
If you're still being asked to log in every time:
1. Check browser console for authentication errors
2. Verify localStorage contains `authToken` and `authUser`
3. Ensure the server is running and accessible

### MongoDB Connection Issues
Make sure your MongoDB connection string is correct in `/server/.env`

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/create-admin` - Create admin user (requires secret)
- `POST /api/auth/verify` - Verify authentication token
- `POST /api/auth/register` - Register new user

## Support
If you encounter issues, check the server console logs and browser console for detailed error messages.
