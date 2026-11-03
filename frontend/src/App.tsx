import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { useAuth } from "./hooks/useAuth";
import { useWorkspaces } from "./hooks/useWorkspaces";
import { DashboardPage } from "./pages/DashboardPage";
import { DraftsPage } from "./pages/DraftsPage";
import { LiveMatchPage } from "./pages/LiveMatchPage";
import { LoginPage } from "./pages/LoginPage";
import { MatchesPage } from "./pages/MatchesPage";
import { MatchDetailPage } from "./pages/MatchDetailPage";
import { ClubJourneyPage } from "./pages/ClubJourneyPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TeamSelectPage } from "./pages/TeamSelectPage";
import { WorkspaceListPage } from "./pages/WorkspaceListPage";

export const App: React.FC = () => {
  const { user, loading: authLoading, login, register, logout, isAuthenticated } = useAuth();
  const {
    workspaces,
    loading: wsLoading,
    addWorkspace,
    renameWorkspace,
    removeWorkspace,
  } = useWorkspaces();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-spin">⚽</span>
          <span>Loading ClubPost...</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans antialiased">
        {isAuthenticated && (
          <Navbar
            workspaces={workspaces}
            userEmail={user?.email}
            onLogout={logout}
          />
        )}

        <main className="flex-1">
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  <Navigate to={workspaces.length > 0 ? `/workspace/${workspaces[0].id}/dashboard` : "/workspaces"} replace />
                ) : (
                  <LoginPage onLogin={login} />
                )
              }
            />
            <Route
              path="/register"
              element={
                isAuthenticated ? (
                  <Navigate to={workspaces.length > 0 ? `/workspace/${workspaces[0].id}/dashboard` : "/workspaces"} replace />
                ) : (
                  <RegisterPage onRegister={register} />
                )
              }
            />

            {/* Protected routes */}
            <Route
              path="/workspaces"
              element={
                !isAuthenticated ? (
                  <Navigate to="/login" replace />
                ) : (
                  <WorkspaceListPage
                    workspaces={workspaces}
                    loading={wsLoading}
                    onAddWorkspace={addWorkspace}
                  />
                )
              }
            />

            <Route
              path="/workspace/:workspaceId/dashboard"
              element={
                !isAuthenticated ? <Navigate to="/login" replace /> : <DashboardPage />
              }
            />

            <Route
              path="/workspace/:workspaceId/match/:matchId"
              element={
                !isAuthenticated ? <Navigate to="/login" replace /> : <MatchDetailPage />
              }
            />

            <Route
              path="/workspace/:workspaceId/club"
              element={
                !isAuthenticated ? <Navigate to="/login" replace /> : <ClubJourneyPage />
              }
            />

            <Route
              path="/workspace/:workspaceId/teams"
              element={
                !isAuthenticated ? <Navigate to="/login" replace /> : <TeamSelectPage />
              }
            />

            <Route
              path="/workspace/:workspaceId/matches"
              element={
                !isAuthenticated ? <Navigate to="/login" replace /> : <MatchesPage />
              }
            />

            <Route
              path="/workspace/:workspaceId/live"
              element={
                !isAuthenticated ? <Navigate to="/login" replace /> : <LiveMatchPage />
              }
            />

            <Route
              path="/workspace/:workspaceId/drafts"
              element={
                !isAuthenticated ? <Navigate to="/login" replace /> : <DraftsPage />
              }
            />

            <Route
              path="/workspace/:workspaceId/settings"
              element={
                !isAuthenticated ? (
                  <Navigate to="/login" replace />
                ) : (
                  <SettingsPage
                    onWorkspaceRenamed={renameWorkspace}
                    onWorkspaceDeleted={removeWorkspace}
                  />
                )
              }
            />

            {/* Fallback route: Go directly to active club dashboard */}
            <Route
              path="*"
              element={
                <Navigate
                  to={
                    isAuthenticated
                      ? workspaces.length > 0
                        ? `/workspace/${workspaces[0].id}/dashboard`
                        : "/workspaces"
                      : "/login"
                  }
                  replace
                />
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

