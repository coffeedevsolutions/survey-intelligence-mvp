# Auth0 Integration Setup

Your survey application now supports both local authentication and Auth0! Here's how to set up Auth0.

## 🔧 Prerequisites

1. **Install the Auth0 dependency:**
   ```bash
   cd api
   npm install express-openid-connect
   ```

2. **Create an Auth0 Application:**
   - Go to [Auth0 Dashboard](https://manage.auth0.com/)
   - Create a new **Regular Web Application**
   - Note your **Domain**, **Client ID**, and **Client Secret**

## ⚙️ Configuration

### Environment Variables

Add these to your `api/.env` file:

```env
# Switch to Auth0 mode
AUTH_PROVIDER=auth0

# Auth0 Configuration
AUTH0_BASE_URL=http://localhost:8787
AUTH0_ISSUER_BASE_URL=https://YOUR_TENANT.us.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_SESSION_SECRET=a_long_random_string_32_chars_min

# Keep existing database and other settings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_survey
DB_USER=postgres
DB_PASSWORD=your_password
```

### Auth0 Application Settings

In your Auth0 application settings:

1. **Allowed Callback URLs:**
   ```
   http://localhost:8787/auth/callback
   ```

2. **Allowed Logout URLs:**
   ```
   http://localhost:5173
   ```

3. **Allowed Web Origins:**
   ```
   http://localhost:5173
   ```

## 🎯 How It Works

### Authentication Flow

1. **Login:** User clicks login → redirected to Auth0 Universal Login
2. **Callback:** Auth0 redirects back to `/auth/callback` with authorization code
3. **Session:** `express-openid-connect` exchanges code for tokens and creates session
4. **Database Link:** User is auto-provisioned in your database with Auth0 identity

### User Management

**Auto-Provisioning:**
- First-time Auth0 users are automatically created in your database
- They're assigned the `requestor` role by default
- Email is verified (since Auth0 handles verification)

**Role Assignment:**
```sql
-- Promote a user to admin (run in psql)
UPDATE user_org_roles 
SET role = 'admin' 
WHERE user_id = (
  SELECT u.id 
  FROM users u 
  JOIN identities i ON i.user_id = u.id 
  WHERE i.provider = 'auth0' 
  AND u.email = 'user@example.com'
);
```

### API Routes

All your existing routes work the same:

- **Login:** `GET /auth/login` (redirects to Auth0)
- **Logout:** `GET /auth/logout` (redirects to Auth0 logout)
- **Status:** `GET /auth/me` (returns user info)
- **Protected Routes:** All existing API routes remain protected

## 🚀 Testing Auth0

1. **Set AUTH_PROVIDER=auth0** in your `.env`
2. **Restart your API server**
3. **Visit the frontend** - login button will redirect to Auth0
4. **Create/login** with Auth0 account
5. **You'll be redirected back** and automatically logged in

## 🔄 Switching Between Auth Providers

**To use Auth0:**
```env
AUTH_PROVIDER=auth0
```

**To use local auth:**
```env
AUTH_PROVIDER=local
```

No code changes needed - just restart the server!

## 🎨 Frontend Changes (Optional)

The existing frontend works with Auth0! But you can enhance it:

```javascript
// Detect auth provider
const isAuth0 = await fetch('/auth/status').then(r => r.json());

// Redirect to Auth0 login
if (isAuth0.provider === 'auth0') {
  window.location.href = '/auth/login';
}
```

## 🛡️ Security Notes

- **HTTPS:** Use HTTPS in production and update `AUTH0_BASE_URL`
- **Secrets:** Keep `AUTH0_CLIENT_SECRET` and `AUTH0_SESSION_SECRET` secure
- **Domains:** Configure proper allowed URLs in Auth0 for production
- **Roles:** Users are auto-provisioned as `requestor` - promote manually as needed

## 🎯 Organization Management

Since Auth0 handles user creation, you'll manage organizations differently:

1. **Create organizations** via your admin interface or SQL
2. **Assign users to orgs** after they first login
3. **Set roles** via database updates or admin interface

Your existing role-based authorization (`requestor`, `reviewer`, `admin`) works perfectly with Auth0!
