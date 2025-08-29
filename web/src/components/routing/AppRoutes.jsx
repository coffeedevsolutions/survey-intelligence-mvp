import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute, RoleProtectedRoute } from "./ProtectedRoute.jsx";
import { LoginPage } from "../auth/LoginPage.jsx";
import { LegacySurvey } from "../survey/LegacySurvey.jsx";
import Dashboard from "../../Dashboard.jsx";
import Campaigns from "../../Campaigns.jsx";
import PublicSurvey from "../../PublicSurvey.jsx";
import Debug from "../../Debug.jsx";

/**
 * Application routing component
 */
export function AppRoutes({ user }) {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/reply/:token" element={<PublicSurvey />} />
      <Route path="/debug" element={<Debug />} />
      
      {/* Protected routes */}
      {user ? (
        <>
          <Route 
            path="/" 
            element={
              <ProtectedRoute user={user}>
                <LegacySurvey />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute user={user}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/campaigns" 
            element={
              <RoleProtectedRoute user={user} requiredRoles={['reviewer', 'admin']}>
                <Campaigns />
              </RoleProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}
