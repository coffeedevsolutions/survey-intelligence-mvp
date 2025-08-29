import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.js";
import { AppHeader } from "./components/layout/AppHeader.jsx";
import { LoadingSpinner } from "./components/layout/LoadingSpinner.jsx";
import { AppRoutes } from "./components/routing/AppRoutes.jsx";
import { NotificationsProvider } from "./components/ui/notifications.jsx";

const queryClient = new QueryClient();

/**
 * Main application component with authentication and routing
 */
function MainApp() {
  const { user, loading, error } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <NotificationsProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <AppHeader user={user} />
          <AppRoutes user={user} />
        </div>
      </Router>
    </NotificationsProvider>
  );
}

/**
 * Root App component with providers
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}