# 🔐 Authentication Guide - Local & Auth0

Your survey application now supports **dual authentication** - you can seamlessly switch between local authentication and Auth0 without changing any code!

## 🏠 Local Authentication (Default)

**Environment Setup:**
```env
AUTH_PROVIDER=local
AUTH_SECRET=change_me_super_secret_64_chars
AUTH_COOKIE=ssid
AUTH_EXPIRES_DAYS=7
```

**Features:**
- ✅ Username/password login
- ✅ Organization creation via API
- ✅ JWT-based sessions with server-side revocation
- ✅ Role-based access control
- ✅ Cookie-based authentication

**User Management:**
```bash
# Create organization and admin
cd api
node create-admin.js

# Add users to organization  
node add-user.js

# Change user roles
node change-role.js
```

## 🌐 Auth0 Integration

**Dependencies:**
```bash
cd api
npm install express-openid-connect
```

**Environment Setup:**
```env
AUTH_PROVIDER=auth0
AUTH0_BASE_URL=http://localhost:8787
AUTH0_ISSUER_BASE_URL=https://YOUR_TENANT.us.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_SESSION_SECRET=a_long_random_string_32_chars_min
```

**Auth0 Application Settings:**
- **Application Type:** Regular Web Application
- **Allowed Callback URLs:** `http://localhost:8787/auth/callback`
- **Allowed Logout URLs:** `http://localhost:5173`
- **Allowed Web Origins:** `http://localhost:5173`

**Features:**
- ✅ Auth0 Universal Login
- ✅ Auto-user provisioning on first login
- ✅ Email verification handled by Auth0
- ✅ Same role-based access control
- ✅ Session-based authentication

## 🔄 Switching Between Auth Providers

**No code changes required!** Just update your environment:

```bash
# Switch to Auth0
echo "AUTH_PROVIDER=auth0" >> api/.env

# Switch back to local
echo "AUTH_PROVIDER=local" >> api/.env

# Restart server
cd api && npm run dev
```

## 🎯 How It Works

### Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Auth Adapter   │    │   Database      │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ Login Form  │ │◄──►│ │ LocalAuth    │ │◄──►│ │ users       │ │
│ │ (or Auth0)  │ │    │ │              │ │    │ │ identities  │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ │ user_org_   │ │
│                 │    │        OR        │    │ │ roles       │ │
│                 │    │ ┌──────────────┐ │    │ └─────────────┘ │
│                 │    │ │ Auth0Auth    │ │    │                 │
│                 │    │ │              │ │    │                 │
│                 │    │ └──────────────┘ │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Authentication Flow

**Local Auth:**
1. User submits form → Local validation
2. JWT created → Stored in httpOnly cookie
3. Subsequent requests → JWT verification

**Auth0:**
1. User clicks login → Redirect to Auth0
2. Auth0 authentication → Callback with code
3. express-openid-connect → Exchange for session
4. Auto-provision user → Link to database

### Database Integration

Both auth methods use the same database schema:

```sql
-- Users table (same for both)
users: id, email, password_hash, email_verified

-- Auth provider tracking
identities: user_id, provider, provider_user_id
-- Local: provider='local', provider_user_id=email
-- Auth0: provider='auth0', provider_user_id=auth0_sub

-- Role assignment (same for both)
user_org_roles: user_id, org_id, role
```

## 🛡️ Role Management

**Roles:** `requestor`, `reviewer`, `admin`

**Local Auth Role Assignment:**
```bash
node add-user.js admin@example.com reviewer
```

**Auth0 Role Assignment:**
```sql
-- After user first logs in via Auth0
UPDATE user_org_roles 
SET role = 'admin' 
WHERE user_id = (
  SELECT u.id FROM users u 
  JOIN identities i ON i.user_id = u.id 
  WHERE i.provider = 'auth0' AND u.email = 'admin@example.com'
);
```

## 🎨 Frontend Behavior

The frontend automatically detects the auth provider:

**Local Auth UI:**
- Shows organization/email/password form
- "Login" button submits to `/auth/login`

**Auth0 UI:**
- Shows "🔐 Login with Auth0" button
- Redirects to Auth0 Universal Login

**Same Dashboard:**
- Both auth methods use the same dashboard
- Same role-based UI components
- Same API endpoints and permissions

## 📡 API Endpoints

All endpoints work with both auth providers:

**Authentication:**
- `POST /auth/register-org` (local only)
- `GET/POST /auth/login` (local form, Auth0 redirect)
- `POST /auth/logout` (works with both)
- `GET /auth/me` (returns user info)

**Protected Routes:**
- `POST /api/sessions` (requestor+)
- `GET /api/sessions` (reviewer+)
- `GET /api/sessions/:id/brief` (reviewer+)
- `GET /api/templates` (admin only)

## 🚀 Production Deployment

**Local Auth:**
- Set `secure: true` for cookies over HTTPS
- Use strong `AUTH_SECRET` (64+ characters)
- Enable rate limiting on login endpoints

**Auth0:**
- Update `AUTH0_BASE_URL` to production domain
- Configure production callback URLs in Auth0
- Use HTTPS for all Auth0 URLs
- Secure `AUTH0_CLIENT_SECRET` and `AUTH0_SESSION_SECRET`

## 🎯 Migration Strategy

**Local → Auth0:**
1. Set up Auth0 application
2. Add Auth0 environment variables
3. Change `AUTH_PROVIDER=auth0`
4. Users login via Auth0 (auto-provisioned)
5. Manually assign roles as needed

**Auth0 → Local:**
1. Export user emails from Auth0
2. Create local accounts via scripts
3. Change `AUTH_PROVIDER=local`
4. Users can login with new passwords

Your authentication system is now **enterprise-ready** and **future-proof**! 🎉
