# AI Security & Compliance Infrastructure Environment Variables Guide

## Overview
This guide provides all the environment variables needed for the AI security and compliance infrastructure to operate in local development mode. Since you're not deployed to production yet, all external services (KMS, monitoring) will use local/mock implementations.

## Environment File Structure

You have **two separate environment files**:
- `api/.env` - Backend API environment variables
- `web/.env` - Frontend web application environment variables

## External Service Requirements

### Required External Services (for production)
1. **AWS KMS**: Customer Managed Keys for encryption
2. **AWS SES**: Simple Email Service for notifications
3. **AWS CloudWatch**: Monitoring and logging
4. **AWS IAM**: Identity and access management
5. **Enterprise SSO** (optional):
   - AWS Cognito for user management
   - Okta or Auth0 for SCIM 2.0
   - SAML/OIDC identity provider

### Local Development Alternatives
- **AWS KMS**: Local encryption (no external service needed)
- **AWS SES**: Mock email service (console logging)
- **AWS CloudWatch**: Mock endpoints (localhost:4318)
- **SSO**: Local authentication only

## AWS Infrastructure Setup Guide

### 1. AWS KMS Setup (Encryption)

1. **Create AWS Account**: https://aws.amazon.com/
2. **Enable KMS Service**: In AWS Console → KMS
3. **Create Customer Managed Key (CMK)**:
   - Go to KMS → Customer managed keys → Create key
   - Key type: Symmetric
   - Key usage: Encrypt and decrypt
   - Add tags: `Service=ai-survey`, `Environment=production`
4. **Create IAM User/Role**:
   - Go to IAM → Users → Create user
   - Attach policy: `AWSKMSFullAccess` (or custom policy)
   - Generate access keys
5. **Environment Variables**:
   ```env
   KMS_PROVIDER=aws
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_KMS_KEY_ID=your_kms_key_id
   ```

### 2. AWS SES Setup (Email Service)

1. **Enable SES**: AWS Console → Simple Email Service
2. **Verify Domain/Email**:
   - Go to Verified Identities → Create identity
   - Choose Domain or Email address
   - Follow verification steps (DNS records for domain)
3. **Move out of Sandbox** (for production):
   - Go to Account dashboard → Request production access
   - Provide use case details and expected volume
4. **Create IAM User**:
   - Go to IAM → Users → Create user
   - Attach policy: `AmazonSESFullAccess` (or custom policy)
   - Generate access keys
5. **Environment Variables**:
   ```env
   EMAIL_SERVICE_PROVIDER=ses
   AWS_SES_REGION=us-east-1
   AWS_SES_ACCESS_KEY_ID=your_access_key
   AWS_SES_SECRET_ACCESS_KEY=your_secret_key
   AWS_SES_FROM_EMAIL=noreply@yourdomain.com
   ```

### 3. AWS CloudWatch Setup (Monitoring)

1. **Enable CloudWatch**: AWS Console → CloudWatch
2. **Create Log Groups**:
   - Go to Logs → Log groups → Create log group
   - Name: `/aws/ai-survey/api`
   - Retention: 30 days
3. **Create Custom Metrics**:
   - Go to Metrics → Custom namespaces
   - Create namespace: `AI-Survey`
4. **Set up Alarms**:
   - Go to Alarms → Create alarm
   - Configure thresholds for error rates, latency
5. **Environment Variables**:
   ```env
   AWS_CLOUDWATCH_REGION=us-east-1
   AWS_CLOUDWATCH_LOG_GROUP=/aws/ai-survey/api
   AWS_CLOUDWATCH_METRICS_NAMESPACE=AI-Survey
   ```

### 4. AWS Cognito Setup (User Management)

1. **Enable Cognito**: AWS Console → Cognito
2. **Create User Pool**:
   - Go to User Pools → Create user pool
   - Configure sign-in options (email, username)
   - Set password policy
   - Configure MFA settings
3. **Create App Client**:
   - Go to App clients → Create app client
   - Type: Public client
   - Configure OAuth flows
4. **Environment Variables**:
   ```env
   AWS_COGNITO_REGION=us-east-1
   AWS_COGNITO_USER_POOL_ID=your_user_pool_id
   AWS_COGNITO_CLIENT_ID=your_client_id
   AWS_COGNITO_CLIENT_SECRET=your_client_secret
   ```

### 5. Enterprise SSO Providers (Optional)

#### Auth0 Setup
1. **Create Auth0 Account**: https://auth0.com/
2. **Create Application**:
   - Go to Applications → Create Application
   - Type: Single Page Application
   - Configure callback URLs
3. **Enable SCIM 2.0**:
   - Go to Enterprise → SCIM
   - Enable SCIM 2.0 for your application
4. **Environment Variables**:
   ```env
   SCIM_PROVIDER=auth0
   SCIM_AUTH_TOKEN=your_auth0_scim_token
   AUTH0_DOMAIN=your_domain.auth0.com
   AUTH0_CLIENT_ID=your_client_id
   ```

#### Okta Setup
1. **Create Okta Account**: https://www.okta.com/
2. **Create Application**:
   - Go to Applications → Create App Integration
   - Type: OIDC - Single-Page App
3. **Enable SCIM**:
   - Go to Applications → Your App → Provisioning
   - Enable SCIM 2.0
4. **Environment Variables**:
   ```env
   SCIM_PROVIDER=okta
   SCIM_AUTH_TOKEN=your_okta_scim_token
   OKTA_DOMAIN=your_domain.okta.com
   OKTA_CLIENT_ID=your_client_id
   ```

### 6. OpenAI API Setup
1. **Create OpenAI Account**: https://platform.openai.com/
2. **Generate API Key**:
   - Go to API Keys → Create new secret key
   - Copy the key (starts with `sk-`)
3. **Environment Variables**:
   ```env
   OPENAI_API_KEY=sk-your_openai_api_key_here
   ```

### 7. AWS IAM Setup (Security)

1. **Create IAM Policies**:
   - Go to IAM → Policies → Create policy
   - Create custom policies for each service:
     - `AI-Survey-KMS-Policy`
     - `AI-Survey-SES-Policy`
     - `AI-Survey-CloudWatch-Policy`
2. **Create IAM Role**:
   - Go to IAM → Roles → Create role
   - Type: AWS service → EC2
   - Attach policies created above
3. **Create IAM User** (for programmatic access):
   - Go to IAM → Users → Create user
   - Attach policies or role
   - Generate access keys
4. **Environment Variables**:
   ```env
   AWS_IAM_ROLE_ARN=arn:aws:iam::account:role/AI-Survey-Role
   AWS_IAM_USER_ACCESS_KEY_ID=your_access_key
   AWS_IAM_USER_SECRET_ACCESS_KEY=your_secret_key
   ```

## Quick Setup Commands

```bash
# Generate a 32-byte encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate MFA secret key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API Environment Variables (`api/.env`)

### Core Backend Configuration
```env
# =============================================================================
# EXISTING VARIABLES (keep these)
# =============================================================================

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ai_survey

# Authentication
AUTH_SECRET=your_existing_auth_secret
JWT_SECRET=your_existing_jwt_secret

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Jira (if using)
JIRA_ENCRYPTION_KEY=your_existing_jira_key

# Email (if using)
EMAIL_SERVICE_API_KEY=your_email_service_key

# =============================================================================
# AI SECURITY & COMPLIANCE INFRASTRUCTURE
# =============================================================================

# Encryption & KMS Configuration
KMS_PROVIDER=local
ENCRYPTION_KEY=your_32_byte_hex_key_here
MFA_ISSUER=AI Survey Platform
MFA_SECRET_KEY=your_mfa_secret_key_here

# Observability & Monitoring
OTEL_SERVICE_NAME=ai-survey-api
OTEL_SERVICE_VERSION=1.0.0
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SAMPLING_RATIO=1.0
OTEL_ENABLE_METRICS=true
OTEL_ENABLE_TRACING=true
METRICS_PORT=9090
METRICS_PATH=/metrics

# Performance & Caching
CACHE_TTL_SHORT=300
CACHE_TTL_MEDIUM=3600
CACHE_TTL_LONG=86400
CACHE_MAX_SIZE=10000
MODEL_ROUTING_ENABLED=true
PROMPT_COMPRESSION_ENABLED=true
PROMPT_COMPRESSION_RATIO=0.7

# Security Policies
POLICY_INPUT_MAX_LENGTH=10000
POLICY_OUTPUT_MAX_LENGTH=50000
POLICY_REQUIRE_NEUTRALITY=true
POLICY_MAX_EXTERNAL_LINKS=0
POLICY_SANITIZE_HTML=true
POLICY_BLOCKED_PATTERNS=system:,admin:,root:,sudo:,<script,javascript:,data:,vbscript:

# Reliability & Circuit Breakers
DEFAULT_TIMEOUT_MS=15000
AI_TIMEOUT_MS=30000
DB_TIMEOUT_MS=10000
MAX_RETRIES=2
RETRY_DELAY_MS=1000
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT_MS=30000

# Cost Optimization
BUDGET_ENFORCEMENT_ENABLED=true
DEFAULT_TENANT_BUDGET_CENTS=10000
GLOBAL_BUDGET_CENTS=100000
BUDGET_ALERT_THRESHOLD=0.8
GPT_3_5_TURBO_INPUT_PRICE=0.1
GPT_3_5_TURBO_OUTPUT_PRICE=0.2
GPT_4O_MINI_INPUT_PRICE=0.15
GPT_4O_MINI_OUTPUT_PRICE=0.6
GPT_4O_INPUT_PRICE=0.5
GPT_4O_OUTPUT_PRICE=1.5
GPT_4_INPUT_PRICE=3.0
GPT_4_OUTPUT_PRICE=6.0

# Compliance & Reporting
COMPLIANCE_FRAMEWORK=SOC2
COMPLIANCE_REPORTING_ENABLED=true
COMPLIANCE_EVIDENCE_AUTO_COLLECTION=true
REPORT_RETENTION_DAYS=90
REPORT_FORMATS=json,pdf,excel

# Database Configuration
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_SLOW_QUERY_THRESHOLD_MS=1000
DB_QUERY_OPTIMIZATION_ENABLED=true

# Logging & Audit
AI_LOG_RETENTION_DAYS=30
AUDIT_LOG_RETENTION_DAYS=90
SYSTEM_LOG_RETENTION_DAYS=30
PII_REDACTION_ENABLED=true
PII_REDACTION_PATTERNS=email,phone,ssn,credit_card

# SCIM 2.0 Configuration
SCIM_BASE_URL=/api/scim/v2
SCIM_AUTH_TOKEN=your_scim_auth_token

# RAG Hardening (Optional)
RAG_ENABLED=false
RAG_VECTOR_DIMENSIONS=1536
RAG_NAMESPACE_PREFIX=tenant_
RAG_REINDEX_SCHEDULE=weekly
RAG_MAX_CONTEXT_AGE_DAYS=30

# Development & Testing
NODE_ENV=development
DEBUG_MODE=true
MOCK_EXTERNAL_SERVICES=true
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/ai_survey_test
TEST_ENCRYPTION_KEY=test_encryption_key_32_bytes_hex
TEST_MFA_SECRET=test_mfa_secret_key

# =============================================================================
# PRODUCTION OVERRIDES (uncomment when deploying)
# =============================================================================

# AWS KMS Configuration
# KMS_PROVIDER=aws
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your_production_aws_key
# AWS_SECRET_ACCESS_KEY=your_production_aws_secret
# AWS_KMS_KEY_ID=your_production_kms_key

# AWS SES Configuration
# EMAIL_SERVICE_PROVIDER=ses
# AWS_SES_REGION=us-east-1
# AWS_SES_ACCESS_KEY_ID=your_ses_access_key
# AWS_SES_SECRET_ACCESS_KEY=your_ses_secret_key
# AWS_SES_FROM_EMAIL=noreply@yourdomain.com

# AWS CloudWatch Configuration
# AWS_CLOUDWATCH_REGION=us-east-1
# AWS_CLOUDWATCH_LOG_GROUP=/aws/ai-survey/api
# AWS_CLOUDWATCH_METRICS_NAMESPACE=AI-Survey

# AWS Cognito Configuration
# AWS_COGNITO_REGION=us-east-1
# AWS_COGNITO_USER_POOL_ID=your_user_pool_id
# AWS_COGNITO_CLIENT_ID=your_client_id
# AWS_COGNITO_CLIENT_SECRET=your_client_secret

# Monitoring Configuration
# OTEL_EXPORTER_OTLP_ENDPOINT=https://your-otel-collector.com
# METRICS_ENDPOINT=https://your-prometheus.com
```

## Web Environment Variables (`web/.env`)

### Frontend Configuration
```env
# =============================================================================
# EXISTING VARIABLES (keep these)
# =============================================================================

# API Endpoint
VITE_API_URL=http://localhost:3000
VITE_API_BASE_URL=http://localhost:3000/api

# Authentication
VITE_AUTH_DOMAIN=your_auth0_domain
VITE_AUTH_CLIENT_ID=your_auth0_client_id
VITE_AUTH_REDIRECT_URI=http://localhost:5173/callback

# =============================================================================
# AI SECURITY & COMPLIANCE FRONTEND CONFIG
# =============================================================================

# Monitoring & Observability
VITE_ENABLE_MONITORING=true
VITE_METRICS_ENDPOINT=http://localhost:9090/metrics
VITE_TRACING_ENABLED=true

# Security Features
VITE_ENABLE_MFA=true
VITE_ENABLE_SCIM=false
VITE_POLICY_ENGINE_ENABLED=true

# Performance Features
VITE_CACHE_ENABLED=true
VITE_COMPRESSION_ENABLED=true
VITE_MODEL_ROUTING_ENABLED=true

# Compliance Features
VITE_COMPLIANCE_MODE=false
VITE_EVIDENCE_COLLECTION=false
VITE_AUDIT_LOGGING=true

# Development Features
VITE_DEBUG_MODE=true
VITE_MOCK_SERVICES=true
VITE_DEV_TOOLS=true

# Feature Flags
VITE_FEATURE_RAG=false
VITE_FEATURE_ADVANCED_MONITORING=true
VITE_FEATURE_COST_OPTIMIZATION=true
VITE_FEATURE_PROMPT_GOVERNANCE=true

# =============================================================================
# PRODUCTION OVERRIDES (uncomment when deploying)
# =============================================================================

# VITE_API_URL=https://your-api-domain.com
# VITE_API_BASE_URL=https://your-api-domain.com/api
# VITE_ENABLE_MONITORING=true
# VITE_METRICS_ENDPOINT=https://your-prometheus.com/metrics
# VITE_COMPLIANCE_MODE=true
# VITE_EVIDENCE_COLLECTION=true
# VITE_DEBUG_MODE=false
# VITE_MOCK_SERVICES=false

# AWS Cognito Integration
# VITE_AUTH_PROVIDER=cognito
# VITE_AWS_COGNITO_REGION=us-east-1
# VITE_AWS_COGNITO_USER_POOL_ID=your_user_pool_id
# VITE_AWS_COGNITO_CLIENT_ID=your_client_id
```

## Local Development Setup

### 1. Generate Required Keys
```bash
# Generate encryption key
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Generate MFA secret
MFA_SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "MFA_SECRET_KEY=$MFA_SECRET_KEY"
```

### 2. Mock External Services
Since you're not deployed, the system will automatically:
- Use local encryption instead of KMS
- Mock OpenTelemetry collectors
- Use in-memory caching
- Disable external monitoring endpoints

### 3. Database Setup
Run the migrations to set up the new tables:
```bash
cd api
npm run migrate
```

## Production Deployment Notes

When you're ready to deploy to production, you'll need to:

1. **Set up KMS Provider**:
   - AWS: Configure AWS KMS with proper IAM roles
   - GCP: Set up Google Cloud KMS with service account
   - Azure: Configure Azure Key Vault with managed identity

2. **Configure Monitoring**:
   - Deploy Prometheus/Grafana for metrics
   - Set up OpenTelemetry collector
   - Configure alerting channels

3. **Enable Production Features**:
   - Set `KMS_PROVIDER=aws` (or gcp/azure)
   - Configure real monitoring endpoints
   - Set up compliance reporting
   - Enable budget enforcement

## Testing the Setup

After adding these variables to your `.env` file:

1. **Test Encryption**:
   ```bash
   cd api
   node -e "
   const { PerTenantKMSManager } = require('./services/perTenantKMS.js');
   const kms = new PerTenantKMSManager();
   console.log('KMS Manager initialized successfully');
   "
   ```

2. **Test MFA**:
   ```bash
   node -e "
   const { MFAService } = require('./services/mfaService.js');
   const mfa = new MFAService();
   console.log('MFA Service initialized successfully');
   "
   ```

3. **Test Monitoring**:
   ```bash
   node -e "
   const { AdvancedMonitoringManager } = require('./services/advancedMonitoring.js');
   const monitoring = new AdvancedMonitoringManager();
   console.log('Monitoring Manager initialized successfully');
   "
   ```

## Troubleshooting

### Common Issues:

1. **Missing Encryption Key**: Generate a proper 32-byte hex key
2. **Database Connection**: Ensure PostgreSQL is running and accessible
3. **Port Conflicts**: Change `METRICS_PORT` if 9090 is in use
4. **Memory Issues**: Reduce `CACHE_MAX_SIZE` if running low on memory

### Debug Mode:
Set `DEBUG_MODE=true` to enable detailed logging for troubleshooting.

## Summary

### Environment File Distribution

**API Environment Variables (`api/.env`)**:
- All backend security, compliance, and infrastructure variables
- Database configuration and connection pooling
- Encryption, KMS, and MFA settings
- Monitoring, observability, and performance tuning
- Cost optimization and budget enforcement
- Compliance reporting and evidence collection

**Web Environment Variables (`web/.env`)**:
- Frontend feature flags and configuration
- API endpoint URLs and authentication settings
- Client-side monitoring and debugging options
- Feature toggles for security and compliance features
- Development and production mode settings

### External Services Required

**For Local Development**: 
- ✅ **None** - All services use local/mock implementations

**For Production Deployment**:
- 🔑 **AWS KMS** - Customer Managed Keys for encryption
- 📧 **AWS SES** - Simple Email Service for notifications
- 📊 **AWS CloudWatch** - Monitoring, logging, and metrics
- 🔐 **AWS Cognito** - User management and authentication
- 🤖 **OpenAI API** - For AI model access
- 🏢 **Enterprise SSO** (Optional) - Auth0/Okta for SCIM 2.0

### Quick Start Checklist

1. **Generate Keys**:
   ```bash
   # Generate encryption key
   ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   
   # Generate MFA secret
   MFA_SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   ```

2. **Add to API `.env`**:
   ```env
   KMS_PROVIDER=local
   ENCRYPTION_KEY=your_generated_key
   MFA_SECRET_KEY=your_generated_secret
   NODE_ENV=development
   DEBUG_MODE=true
   MOCK_EXTERNAL_SERVICES=true
   ```

3. **Add to Web `.env`**:
   ```env
   VITE_DEBUG_MODE=true
   VITE_MOCK_SERVICES=true
   VITE_ENABLE_MONITORING=true
   ```

4. **Run Database Migrations**:
   ```bash
   cd api
   npm run migrate
   ```

5. **Test the Setup**:
   ```bash
   # Test API
   cd api && npm start
   
   # Test Web
   cd web && npm run dev
   ```

This setup will allow all AI security and compliance features to work perfectly in local development mode! 🎉
