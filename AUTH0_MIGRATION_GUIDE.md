# Auth0 Migration Guide

## Current State: Local Authentication ✅

Your application now uses a provider-agnostic auth architecture that makes Auth0 migration seamless.

### What's Ready for Auth0

**🔧 Database Schema:**
- `identities` table tracks multiple auth providers per user
- `users` table has `email_verified` and `mfa_enabled` columns
- User roles remain in your database (recommended approach)

**🏗️ Architecture:**
- `AuthAdapter` interface with Local/Auth0 implementations
- Provider selection via `AUTH_PROVIDER` environment variable
- OIDC-compatible JWT token format

**🔄 Migration Path:**
```
Local Auth (today) → Dual Auth (transition) → Auth0 Only (future)
```

## When You're Ready for Auth0

### 1. Set Up Auth0 Application

```bash
# In Auth0 Dashboard:
# 1. Create SPA Application for frontend
# 2. Create API for backend (audience)
# 3. Note: domain, client_id, audience
```

### 2. Install Auth0 Dependencies

```bash
cd api
npm install jose  # for JWKS verification
```

### 3. Update Environment Variables

```bash
# Switch provider
AUTH_PROVIDER=auth0

# Add Auth0 config
AUTH0_ISSUER=https://your-tenant.us.auth0.com/
AUTH0_AUDIENCE=ai-survey-api
AUTH0_CLIENT_ID=your_client_id
```

### 4. Complete Auth0Auth Implementation

The stub in `auth0-auth.js` needs:
- JWKS verification using `jose` library
- Custom claims mapping for organization context
- User provisioning flow for new Auth0 users

### 5. Frontend Changes

```javascript
// Current: Cookie-based auth
fetch('/auth/login', { credentials: 'include' })

// Auth0: Token-based auth
fetch('/api/sessions', { 
  headers: { 'Authorization': `Bearer ${accessToken}` }
})
```

### 6. Migration Strategy

**Phase 1: Dual Stack**
- Accept both cookies (local) and Bearer tokens (Auth0)
- Users can log in via either method
- Gradually migrate users to Auth0

**Phase 2: Auth0 Only**
- Disable local login UI
- Remove cookie auth support
- All users use Auth0 Universal Login

## Token Format Comparison

**Local Auth (current):**
```json
{
  "iss": "http://localhost:8787/",
  "aud": "ai-survey-api", 
  "sub": "123",
  "orgId": 1,
  "orgSlug": "acme",
  "role": "admin",
  "email": "user@example.com",
  "jti": "uuid",
  "iat": 1735170000,
  "exp": 1735774800
}
```

**Auth0 (future):**
```json
{
  "iss": "https://your-tenant.us.auth0.com/",
  "aud": "ai-survey-api",
  "sub": "auth0|abcd1234",
  "email": "user@example.com",
  "https://yourapp.com/org": "acme",
  "https://yourapp.com/role": "admin",
  "iat": 1735170000,
  "exp": 1735774800
}
```

## Benefits of This Architecture

✅ **Zero Business Logic Changes** - roles/permissions stay in your DB  
✅ **Gradual Migration** - run both auth methods simultaneously  
✅ **Provider Independence** - easy to switch or add more providers  
✅ **Enterprise Ready** - Auth0 handles SSO, MFA, compliance  

## Files Modified for Auth0 Readiness

- `api/config/config/database.js` - Added identities table and user columns
- `api/auth-adapter.js` - Provider interface
- `api/auth-local.js` - Local auth implementation  
- `api/auth0-auth.js` - Auth0 stub (complete when ready)
- `api/auth-provider.js` - Provider selector
- `api/config/server.js` - Uses adapter pattern

## Next Steps

1. **Test current local auth** - ensure everything works
2. **Plan Auth0 setup** - create applications, configure domains
3. **Implement Auth0Auth** - complete the JWKS verification
4. **Test dual stack** - both local and Auth0 simultaneously
5. **Migrate users** - invite/transition existing users
6. **Go Auth0-only** - disable local auth

Your authentication system is now **Auth0-ready** without any breaking changes! 🚀
