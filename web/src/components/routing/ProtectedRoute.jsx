import { Navigate } from "react-router-dom";

/**
 * Protected route component that requires authentication
 */
export function ProtectedRoute({ children, user, redirectTo = "/" }) {
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return children;
}

/**
 * Role-based protected route component
 */
export function RoleProtectedRoute({ children, user, requiredRoles = [], redirectTo = "/" }) {
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }
  
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return children;
}
