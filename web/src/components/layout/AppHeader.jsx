import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../utils/api.js";

/**
 * Navigation header component
 */
export function AppHeader({ user }) {
  const navigate = useNavigate();
  
  if (!user) return null;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 
              className="text-xl font-bold text-gray-900 cursor-pointer hover:text-gray-700 transition-colors" 
              onClick={() => navigate('/')}
            >
              AI Survey Platform
            </h1>
          </div>
          
          <nav className="flex items-center space-x-4">
            {(user.role === 'reviewer' || user.role === 'admin') && (
              <>
                <NavButton 
                  onClick={() => navigate('/dashboard')}
                  text="Dashboard"
                />
                <NavButton 
                  onClick={() => navigate('/campaigns')}
                  text="Campaigns"
                />
              </>
            )}
            
            <UserInfo user={user} />
          </nav>
        </div>
      </div>
    </div>
  );
}

/**
 * Navigation button component
 */
function NavButton({ onClick, text }) {
  return (
    <button 
      onClick={onClick}
      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
    >
      {text}
    </button>
  );
}

/**
 * User information and logout section
 */
function UserInfo({ user }) {
  return (
    <div className="flex items-center space-x-3">
      <span className="text-sm text-gray-600">
        {user.email} ({user.role})
        {user.orgSlug && ` @ ${user.orgSlug}`}
      </span>
      <a 
        href={`${API_BASE_URL}/auth/logout`}
        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
      >
        Logout
      </a>
    </div>
  );
}
