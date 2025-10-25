# Web Frontend Environment Variables Template
# Copy this to web/.env and update with your actual values

# API Configuration
VITE_API_URL=http://localhost:8787

# AWS Cognito Integration (for future MFA/SCIM integration)
VITE_AWS_COGNITO_REGION=us-east-1
VITE_AWS_COGNITO_USER_POOL_ID=your_user_pool_id
VITE_AWS_COGNITO_CLIENT_ID=your_client_id

# Auth0 Configuration (existing)
VITE_AUTH0_DOMAIN=dev-2ky8qfj4lxziowuc.us.auth0.com
VITE_AUTH0_CLIENT_ID=46Sc3uvK633YymTBDY2VeSlHP0dYUbha
VITE_AUTH0_AUDIENCE=https://dev-2ky8qfj4lxziowuc.us.auth0.com/api/v2/

# Security & Compliance Features
VITE_MONITORING_ENABLED=true
VITE_COMPLIANCE_MODE=enabled
VITE_MFA_ENABLED=false
VITE_SCIM_ENABLED=false

# Development Settings
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=info

