import { API_BASE_URL } from "../../utils/api.js";
import { EmbeddedLoginForm } from "./EmbeddedLoginForm.jsx";

/**
 * Login page component with two-column layout
 */
export function LoginPage() {
  return (
    <div className="login-container">
      {/* Left Column - Login Form */}
      <div className="login-left-column">
        {/* Mobile gradient background */}
        <div className="absolute inset-0 md:hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 opacity-5"></div>
        <div className="relative z-10 max-w-md w-full space-y-8">
          <LoginHeader />
          <LoginForm />
        </div>
      </div>

      {/* Right Column - Gradient Background */}
      <div className="login-right-column">
        <GradientBackground />
        <GradientContent />
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
      {/* Logo */}
      <div className="mb-0">
        <img 
          src="/images/uptaik-logo-text-gradient.png" 
          alt="Uptaik Logo" 
          className="h-auto w-auto mx-auto"
        />
      </div>
      
      <h2 className="text-3xl font-extrabold text-gray-900">
        AI Project Workflow Platform
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
  return <EmbeddedLoginForm />;
}

/**
 * Animated gradient background with blob effects
 */
function GradientBackground() {
  return (
    <div className="absolute inset-0">
      {/* Animated background elements */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
      </div>
    </div>
  );
}

/**
 * Content overlay for the gradient background
 */
function GradientContent() {
  return (
    <div className="relative z-10 flex flex-col h-full px-8">
      {/* Logo at the top */}
      <div className="pt-8 pb-4">
        <img 
          src="/images/uptaik-logo-text-white.png" 
          alt="Uptaik Logo" 
          className="h-auto w-auto max-w-128 mx-auto"
        />
      </div>
      
      {/* Centered content */}
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        {/* Main gradient text */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight font-[family-name:var(--font-suse-mono)]">
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient-x">
            Upgrade your intake.
          </span>
        </h1>
        
        {/* Subtle subtitle */}
        <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-2xl font-[family-name:var(--font-suse-mono)]">
          Transform scattered requests into structured workflows with AI-powered intelligence
        </p>
        
        {/* Decorative line */}
        <div className="mt-8 flex justify-center">
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
        </div>

        {/* Feature highlights right underneath */}
        <div className="mt-8 space-y-5 max-w-2xl text-left">
          <div className="flex items-start text-gray-300">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mr-5 mt-1 flex-shrink-0"></div>
            <div>
              <div className="text-lg font-semibold text-white mb-2">Intelligent Survey Routing</div>
              <div className="text-base text-gray-300">AI-powered question flow that adapts to user responses, ensuring comprehensive data collection</div>
            </div>
          </div>
          <div className="flex items-start text-gray-300">
            <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mr-5 mt-1 flex-shrink-0"></div>
            <div>
              <div className="text-lg font-semibold text-white mb-2">Automated Brief Generation</div>
              <div className="text-base text-gray-300">Transform survey responses into structured project briefs with AI-generated insights and recommendations</div>
            </div>
          </div>
          <div className="flex items-start text-gray-300">
            <div className="w-4 h-4 bg-gradient-to-r from-pink-400 to-blue-400 rounded-full mr-5 mt-1 flex-shrink-0"></div>
            <div>
              <div className="text-lg font-semibold text-white mb-2">Real-time Collaboration</div>
              <div className="text-base text-gray-300">Seamless team workflows with instant notifications, shared dashboards, and collaborative review processes</div>
            </div>
          </div>
          <div className="flex items-start text-gray-300">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-pink-400 rounded-full mr-5 mt-1 flex-shrink-0"></div>
            <div>
              <div className="text-lg font-semibold text-white mb-2">Advanced Analytics</div>
              <div className="text-base text-gray-300">Comprehensive reporting with trend analysis, response patterns, and actionable business insights</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
