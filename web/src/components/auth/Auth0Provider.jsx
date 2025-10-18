/**
 * Simple Auth0 Provider wrapper component
 * Uses backend session-based Auth0 authentication
 */
export function Auth0ProviderWrapper({ children }) {
  // No Auth0 React SDK needed - using backend session authentication
  return children;
}
