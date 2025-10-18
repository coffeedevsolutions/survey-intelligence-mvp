import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.js";
import { Topbar } from "./layout/Topbar.jsx";
import { AppSidebar } from "./layout/AppSidebar.jsx";
import { SidebarProvider } from "./components/ui/sidebar.jsx";
import { LoadingSpinner } from "./layout/LoadingSpinner.jsx";
import { AppRoutes } from "./routing/AppRoutes.jsx";
import { NotificationsProvider } from "./components/ui/notifications.jsx";
import { Auth0ProviderWrapper } from "./components/auth/Auth0Provider.jsx";

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

  // If no user, render login page without the main app wrapper
  if (!user) {
    return (
      <NotificationsProvider>
        <Router>
          <AppRoutes user={user} />
        </Router>
      </NotificationsProvider>
    );
  }

  // If user is authenticated, render the main app with sidebar and header
  return (
    <NotificationsProvider>
      <Router>
        <SidebarProvider>
          <div className="h-screen bg-gray-50 flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col w-full min-w-0 main-content">
              <Topbar />
              <div className="flex-1 overflow-auto w-full content-full-width">
                <div className="route-container">
                  <AppRoutes user={user} />
                </div>
              </div>
            </div>
          </div>
        </SidebarProvider>
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
      <Auth0ProviderWrapper>
        <MainApp />
      </Auth0ProviderWrapper>
    </QueryClientProvider>
  );
}