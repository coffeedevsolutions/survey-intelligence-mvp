# AI Survey API - Restructured Architecture

A modern, scalable API for AI-powered survey and brief generation with enterprise features, now organized using domain-driven design principles.

## 🏗️ Current Architecture

```
api/
├── src/
│   ├── index.js                    # Clean entry point
│   ├── app.js                      # Express app configuration
│   │
│   ├── core/                       # Core business domains
│   │   ├── surveys/               # Survey management
│   │   │   ├── routes/            # session.routes.js, enhanced-survey.routes.js
│   │   │   └── services/          # surveyEngine.js, adaptiveEngine.js
│   │   ├── briefs/                # Brief generation & review
│   │   │   ├── routes/            # briefs.routes.js
│   │   │   └── services/          # brief services
│   │   ├── campaigns/             # Campaign management
│   │   │   ├── routes/            # campaigns.routes.js
│   │   │   └── services/          # campaign services
│   │   ├── solutioning/           # Solution decomposition
│   │   │   ├── routes/            # solutioning.routes.js
│   │   │   └── services/          # solutioningService.js, pmTemplateService.js
│   │   ├── analytics/             # Analytics & reporting
│   │   │   ├── routes/            # analytics.routes.js, favorites.routes.js
│   │   │   └── services/          # analyticsService.js
│   │   └── stack/                 # Tech stack management
│   │       ├── routes/            # stack.routes.js
│   │       └── services/          # stack services
│   │
│   ├── platform/                   # Cross-cutting services
│   │   ├── ai/                    # AI services & providers
│   │   │   ├── services/          # aiService.js, aiContextService.js
│   │   │   ├── providers/         # openai.provider.js
│   │   │   └── validators/        # aiResponseValidator.js
│   │   ├── auth/                  # Authentication & authorization
│   │   │   ├── providers/         # auth-local.js, auth0-auth.js
│   │   │   ├── services/          # auth-provider.js, auth-enhanced.js
│   │   │   └── routes/            # auth routes
│   │   ├── integrations/          # External integrations
│   │   │   ├── jira/              # Jira integration
│   │   │   ├── email/             # Email service
│   │   │   └── routes/             # integration routes
│   │   ├── documents/             # Document processing
│   │   │   └── services/          # documentExport.js, htmlSanitizer.js
│   │   └── templates/             # Template management
│   │       ├── routes/            # pmTemplate.routes.js, unified-templates.routes.js
│   │       └── services/          # template services
│   │
│   ├── enterprise/                 # Optional enterprise features
│   │   ├── compliance/             # SOC2, audit, automation
│   │   ├── security/               # MFA, encryption, SCIM
│   │   ├── optimization/           # Cost, performance, governance
│   │   └── middleware/             # Enterprise middleware
│   │
│   ├── database/                   # Database layer
│   │   ├── connection.js          # Connection management
│   │   ├── schema.js              # Schema initialization
│   │   ├── migrations/            # Database migrations
│   │   └── repositories/          # Data access layer
│   │       ├── base.repository.js # Base repository class
│   │       ├── session.repository.js
│   │       ├── brief.repository.js
│   │       ├── campaign.repository.js
│   │       └── [other repositories]
│   │
│   ├── config/                     # Configuration
│   │   ├── index.js               # Config loader & validation
│   │   ├── environment.js         # Environment schema
│   │   ├── features.js            # Feature flags
│   │   ├── encryption.config.js   # Encryption config
│   │   ├── observability.js       # Observability setup
│   │   └── surveyOptimization.js  # Survey optimization
│   │
│   ├── middleware/                 # Core middleware
│   │   ├── index.js               # Middleware exports
│   │   ├── auth.middleware.js     # Authentication
│   │   ├── error.middleware.js    # Error handling
│   │   └── validation.middleware.js # Request validation
│   │
│   └── utils/                      # Utilities
│       ├── piiRedactor.js
│       └── htmlSanitizer.js
│
├── scripts/                        # Utility scripts
├── schemas/                        # JSON schemas
├── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Environment variables configured

### Installation
```bash
cd api
npm install
```

### Environment Setup
Copy `.env.example` to `.env` and configure:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/ai_survey
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_survey
DB_USER=postgres
DB_PASSWORD=your_password

# Auth Configuration
AUTH_PROVIDER=auth0  # or 'local'
JWT_SECRET=your_jwt_secret_here

# Auth0 Configuration (if using Auth0)
AUTH0_BASE_URL=http://localhost:8787
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# CORS Configuration
WEB_ORIGIN=http://localhost:5173
CLIENT_ORIGIN=http://localhost:5173,http://localhost:3000
```

### Running the API
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:8787`

## 📋 Frontend Integration Audit Guide

After the API restructuring, you need to audit your frontend to ensure all API calls are connecting correctly. Follow this comprehensive checklist:

### 1. **API Base URL Verification**

**Check your frontend's API base URL configuration:**

```javascript
// Look for these patterns in your frontend code:
const API_BASE_URL = 'http://localhost:8787';  // Should point to new API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8787';
```

**Files to check:**
- `web/src/utils/api.js` (or similar API utility file)
- `web/src/config/` directory
- Environment files (`.env`, `.env.local`, `.env.development`)

### 2. **Authentication Flow Audit**

**Verify authentication endpoints:**

```javascript
// Check these authentication calls:
POST /api/auth/login          // Login endpoint
POST /api/auth/logout         // Logout endpoint  
GET  /api/auth/me            // Get current user
POST /api/auth/register-org  // Organization registration
```

**Frontend files to audit:**
- `web/src/contexts/AuthContext.jsx`
- `web/src/services/authService.js`
- `web/src/components/auth/` directory
- Any login/logout components

**Test authentication flow:**
1. Try logging in with valid credentials
2. Check if user session persists on page refresh
3. Verify logout clears session properly
4. Test protected route access

### 3. **Core Feature Endpoints Audit**

**Survey Management:**
```javascript
// Check these survey-related calls:
GET  /api/sessions           // List sessions
POST /api/sessions           // Create session
GET  /api/sessions/:id       // Get session details
POST /api/sessions/:id/answer // Submit answer
POST /api/sessions/:id/submit // Submit session
GET  /api/sessions/:id/brief // Get generated brief
```

**Brief Management:**
```javascript
// Check these brief-related calls (NOTE: All brief routes require /orgs/:orgId prefix):
GET  /api/briefs/orgs/:orgId/briefs/review                    // List briefs for review
GET  /api/briefs/orgs/:orgId/briefs/:briefId/preview         // Get brief preview
GET  /api/briefs/orgs/:orgId/briefs/:briefId/export/:format  // Export brief
POST /api/briefs/orgs/:orgId/briefs/:briefId/review          // Review brief
POST /api/briefs/orgs/:orgId/briefs/:briefId/comments        // Add comment
GET  /api/briefs/orgs/:orgId/briefs/:briefId/comments        // Get comments
```

**Campaign Management:**
```javascript
// Check these campaign-related calls (NOTE: All campaign routes require /orgs/:orgId prefix):
GET  /api/campaigns/orgs/:orgId/campaigns                    // List campaigns
POST /api/campaigns/orgs/:orgId/campaigns                     // Create campaign
GET  /api/campaigns/orgs/:orgId/campaigns/:id                 // Get campaign details
PUT  /api/campaigns/orgs/:orgId/campaigns/:id                 // Update campaign
GET  /api/campaigns/orgs/:orgId/campaigns/:id/responses       // Get campaign responses
```

**Templates:**
```javascript
// Check these template-related calls (NOTE: Templates use /unified-templates path):
GET  /api/templates/orgs/:orgId/unified-templates              // List templates
GET  /api/templates/orgs/:orgId/unified-templates/:id          // Get template details
POST /api/templates/orgs/:orgId/unified-templates               // Create template
PUT  /api/templates/orgs/:orgId/unified-templates/:id            // Update template
```

**Solutioning:**
```javascript
// Check these solutioning-related calls (NOTE: All routes require /orgs/:orgId prefix):
GET  /api/solutioning/orgs/:orgId/solutions                     // List solutions
GET  /api/solutioning/orgs/:orgId/solutions/:id                 // Get solution details
GET  /api/solutioning/orgs/:orgId/solutions/slug/:slug         // Get solution by slug
POST /api/solutioning/orgs/:orgId/solutions/generate            // Generate solution
```

**Integrations:**
```javascript
// Check these integration-related calls (NOTE: No /orgs/:orgId prefix for integrations):
GET  /api/integrations/jira/connection                           // Get Jira connection status
POST /api/integrations/jira/connection                          // Configure Jira connection
DELETE /api/integrations/jira/connection                         // Remove Jira connection
GET  /api/integrations/jira/test-connection                      // Test Jira connection
```

### 4. **Critical Endpoint Path Changes**

**⚠️ IMPORTANT: The API restructuring has changed endpoint paths!**

**Key Changes:**
1. **Most endpoints now require `/orgs/:orgId` prefix** - This is for multi-tenant isolation
2. **Templates use `/unified-templates` instead of `/templates`** - Updated naming convention
3. **Solutioning uses `/solutions` instead of `/systems`** - Updated naming convention
4. **Integrations don't use `/orgs/:orgId` prefix** - Global configuration

**Frontend Migration Required:**
```javascript
// OLD PATHS (will return 404):
GET /api/briefs
GET /api/campaigns  
GET /api/templates
GET /api/solutioning/systems

// NEW PATHS (working):
GET /api/briefs/orgs/:orgId/briefs/review
GET /api/campaigns/orgs/:orgId/campaigns
GET /api/templates/orgs/:orgId/unified-templates
GET /api/solutioning/orgs/:orgId/solutions
```

**Frontend files to update:**
- All API utility functions
- Route definitions
- Component API calls
- Error handling for 404s

### 5. **Error Handling Audit**

**Check error response handling:**

```javascript
// Ensure your frontend handles these error patterns:
{
  "error": "error_message",
  "success": false
}

// Success responses:
{
  "success": true,
  "data": {...}
}
```

**Frontend files to check:**
- API utility functions
- Error boundary components
- Toast/notification systems
- Loading states

### 6. **CORS and Cookie Configuration**

**Verify CORS settings:**
- Check if your frontend origin is included in `CLIENT_ORIGIN`
- Ensure cookies are being sent with requests
- Verify `credentials: 'include'` in fetch requests

**Frontend fetch configuration:**
```javascript
// Ensure requests include credentials:
fetch('/api/sessions', {
  method: 'GET',
  credentials: 'include',  // Important for cookie-based auth
  headers: {
    'Content-Type': 'application/json',
  }
})
```

### 7. **Environment Variables Audit**

**Check frontend environment variables:**

```bash
# In your web/.env file, verify:
REACT_APP_API_URL=http://localhost:8787
REACT_APP_AUTH_PROVIDER=auth0
REACT_APP_AUTH0_DOMAIN=your-domain.auth0.com
REACT_APP_AUTH0_CLIENT_ID=your_client_id
```

### 8. **API Response Format Changes**

**Check if response formats changed:**

The API now uses repository patterns, so response formats may have changed. Check:

- Session data structure
- Brief data structure  
- Campaign data structure
- Error message formats

### 9. **Testing Checklist**

**Manual Testing Steps:**

1. **Health Check:**
   ```bash
   curl http://localhost:8787/health
   ```

2. **Authentication Test:**
   - Login with valid credentials
   - Check `/api/auth/me` returns user data
   - Verify protected routes work

3. **Core Features Test:**
   - Create a new survey session
   - Submit survey answers
   - Generate a brief
   - Create a campaign
   - View analytics dashboard

4. **Error Handling Test:**
   - Try invalid login credentials
   - Access protected route without auth
   - Submit invalid data

### 10. **Common Issues and Solutions**

**Issue: 401 Unauthorized**
- Check if authentication cookies are being sent
- Verify JWT_SECRET is set correctly
- Check Auth0 configuration if using Auth0

**Issue: CORS Errors**
- Verify CLIENT_ORIGIN includes your frontend URL
- Check if credentials are included in requests

**Issue: 404 Not Found**
- Verify API base URL is correct
- Check if route paths have changed

**Issue: 500 Internal Server Error**
- Check API server logs
- Verify database connection
- Check environment variables

### 11. **Debug Commands**

**Check API server status:**
```bash
# Test health endpoint
curl http://localhost:8787/health

# Check if server is running
netstat -an | grep 8787

# View API logs
npm run dev  # Check console output
```

**Check frontend API calls:**
- Open browser DevTools → Network tab
- Monitor API requests and responses
- Check for failed requests (red entries)

## 🔧 Development

### Project Structure Benefits

- **Domain-Driven Design**: Clear separation of business domains
- **Repository Pattern**: Consistent data access layer
- **Feature Flags**: Conditional loading of enterprise features
- **Modular Architecture**: Easy to test and maintain
- **Scalable Structure**: Ready for microservices extraction

### Key Features

- **Multi-tenant Architecture**: Organization-based data isolation
- **AI Integration**: OpenAI-powered survey and brief generation
- **Enterprise Features**: SOC2 compliance, MFA, SCIM, cost optimization
- **Observability**: OpenTelemetry integration for monitoring
- **Security**: Row-level security, encryption, audit logging

### Adding New Features

1. **Core Domain**: Add to appropriate `core/*/` directory
2. **Platform Service**: Add to `platform/*/` directory  
3. **Enterprise Feature**: Add to `enterprise/*/` with feature flags
4. **Database**: Create repository in `database/repositories/`
5. **Routes**: Add route handlers in domain's `routes/` directory

## 📚 API Documentation

### Authentication

The API supports two authentication methods:

1. **Local Authentication** (`AUTH_PROVIDER=local`):
   - JWT-based authentication
   - Cookie-based sessions
   - Email/password login

2. **Auth0 Authentication** (`AUTH_PROVIDER=auth0`):
   - OpenID Connect
   - Social login support
   - Enterprise SSO

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/auth/login` | POST | User login |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/me` | GET | Current user info |
| `/api/sessions` | GET/POST | Survey sessions |
| `/api/briefs` | GET/PUT | Brief management |
| `/api/campaigns` | GET/POST/PUT | Campaign management |
| `/api/analytics/dashboard` | GET | Analytics data |

### Error Responses

All API endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "success": false
}
```

### Success Responses

Successful operations return:

```json
{
  "success": true,
  "data": { /* response data */ }
}
```

## 🚨 Troubleshooting

### Server Won't Start

1. **Check environment variables:**
   ```bash
   # Verify required variables are set
   echo $DATABASE_URL
   echo $JWT_SECRET
   ```

2. **Check database connection:**
   ```bash
   # Test PostgreSQL connection
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **Check port availability:**
   ```bash
   # Check if port 8787 is available
   netstat -an | grep 8787
   ```

### Frontend Connection Issues

1. **Check CORS configuration:**
   - Verify `CLIENT_ORIGIN` includes your frontend URL
   - Check if requests include `credentials: 'include'`

2. **Check authentication:**
   - Verify auth provider configuration
   - Check if cookies are being sent

3. **Check API base URL:**
   - Ensure frontend points to correct API URL
   - Verify environment variables are loaded

### Database Issues

1. **Connection errors:**
   - Check `DATABASE_URL` format
   - Verify PostgreSQL is running
   - Check SSL configuration

2. **Migration issues:**
   - Check migration files in `src/database/migrations/`
   - Verify database permissions

## 📞 Support

For issues or questions:

1. Check this README first
2. Review API server logs
3. Check frontend browser console
4. Verify environment configuration
5. Test with curl commands

## 🎯 Migration Complete

The API has been successfully restructured with:
- ✅ Modular domain-driven architecture
- ✅ Repository pattern for data access
- ✅ Enterprise feature flags
- ✅ Clean separation of concerns
- ✅ Comprehensive error handling
- ✅ Observability integration

Your frontend should now connect to the new, scalable API structure!