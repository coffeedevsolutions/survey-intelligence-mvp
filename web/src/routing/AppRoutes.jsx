import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute, RoleProtectedRoute } from "./ProtectedRoute.jsx";
import { LoginPage } from "../pages/entry/LoginPage.jsx";
import { LegacySurvey } from "../pages/surveys/components/LegacySurvey.jsx";
import AppContent from "../AppContent.jsx";
import Surveys from "../pages/surveys/Surveys.jsx";
import Analytics from "../pages/analytics/Analytics.jsx";
import Campaigns from "../pages/campaigns/Campaigns.jsx";
import SolutionManagement from "../pages/solutionmgmt/SolutionManagement.jsx";
import SolutionDetails from "../pages/solutionmgmt/SolutionDetails.jsx";
import PublicSurvey from "../extsurvey/PublicSurvey.jsx";
import Debug from "../Debug.jsx";
import Review from "../pages/documentation/Review.jsx";
import Roadmap from "../pages/roadmap/Roadmap.jsx";

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
            path="/dashboard" 
            element={
              <ProtectedRoute user={user}>
                <AppContent />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/surveys" 
            element={
              <ProtectedRoute user={user}>
                <Surveys />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <RoleProtectedRoute user={user} requiredRoles={['reviewer', 'admin']}>
                <Analytics />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="/solution-management" 
            element={
              <RoleProtectedRoute user={user} requiredRoles={['reviewer', 'admin']}>
                <SolutionManagement />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="/solution/:slug" 
            element={
              <RoleProtectedRoute user={user} requiredRoles={['reviewer', 'admin']}>
                <SolutionDetails />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="/survey" 
            element={
              <ProtectedRoute user={user}>
                <LegacySurvey />
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
          <Route 
            path="/review" 
            element={
              <RoleProtectedRoute user={user} requiredRoles={['reviewer', 'admin']}>
                <Review />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="/roadmap" 
            element={
              <RoleProtectedRoute user={user} requiredRoles={['reviewer', 'admin']}>
                <Roadmap />
              </RoleProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
