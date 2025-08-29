import { LocalAuth, installLocalAuth } from "./auth-local.js";
import { Auth0Auth } from "./auth0-auth.js";

export function buildAuth(app) {
  const provider = (process.env.AUTH_PROVIDER || "local").toLowerCase();
  
  console.log(`🔐 Initializing auth provider: ${provider}`);
  
  if (provider === "auth0" || provider === "auth0-oicd") {
    console.log("📡 Auth0 mode: using express-openid-connect middleware");
    const auth0 = new Auth0Auth();
    auth0.install(app); // Install Auth0 middleware and routes
    return auth0;
  }
  
  // Default to local auth
  console.log("🏠 Local auth mode: using cookies and JWT");
  installLocalAuth(app);
  return new LocalAuth();
}

// Export for environment variable reference
export const AUTH_PROVIDERS = {
  LOCAL: "local",
  AUTH0: "auth0"
};
