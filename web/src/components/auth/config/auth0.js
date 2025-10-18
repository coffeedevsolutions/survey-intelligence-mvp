// Configuration file for Auth0
export const auth0Config = {
  domain: 'dev-2ky8qfj4lxziowuc.us.auth0.com',
  clientId: '46Sc3uvK633YymTBDY2VeSlHP0dYUbha',
  audience: 'https://dev-2ky8qfj4lxziowuc.us.auth0.com/api/v2/',
  apiUrl: 'http://localhost:8787'
};

// Try to get from environment variables first, fallback to hardcoded values
export const getAuth0Config = () => {
  return {
    domain: import.meta.env.VITE_AUTH0_DOMAIN || auth0Config.domain,
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || auth0Config.clientId,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE || auth0Config.audience,
    apiUrl: import.meta.env.VITE_API_URL || auth0Config.apiUrl
  };
};
