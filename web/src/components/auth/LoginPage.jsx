import { API_BASE_URL } from "../../utils/api.js";

/**
 * Login page component
 */
export function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <LoginHeader />
        <LoginForm />
      </div>
    </div>
  );
}

/**
 * Login page header
 */
function LoginHeader() {
  return (
    <div className="text-center">
      <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
        AI Survey Platform
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Sign in to access your surveys and campaigns
      </p>
    </div>
  );
}

/**
 * Login form component
 */
function LoginForm() {
  return (
    <div className="text-center">
      <a 
        href={`${API_BASE_URL}/auth/login`}
        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
      >
        🔐 Login with Auth0
      </a>
      <p className="mt-3 text-xs text-gray-500">
        You'll be redirected to Auth0 for secure authentication
      </p>
    </div>
  );
}
