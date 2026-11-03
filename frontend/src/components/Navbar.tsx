import React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiUsageBadge } from "./ApiUsageBadge";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import type { Workspace } from "../types/workspace";

interface Props {
  workspaces: Workspace[];
  userEmail?: string;
  onLogout: () => void;
}

export const Navbar: React.FC<Props> = ({ workspaces, userEmail, onLogout }) => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = workspaceId
    ? [
        { name: "🏟️ Dashboard", path: `/workspace/${workspaceId}/dashboard` },
        { name: "📊 Club Journey", path: `/workspace/${workspaceId}/club` },
        { name: "📅 Fixtures & Results", path: `/workspace/${workspaceId}/matches` },
        { name: "📋 Drafts Queue", path: `/workspace/${workspaceId}/drafts` },
        { name: "⚙️ Settings", path: `/workspace/${workspaceId}/settings` },
      ]
    : [];

  return (
    <header className="bg-gray-800/90 backdrop-blur border-b border-gray-700 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand + Workspace Switcher */}
          <div className="flex items-center gap-4">
            <Link
              to={workspaceId ? `/workspace/${workspaceId}/dashboard` : workspaces.length > 0 ? `/workspace/${workspaces[0].id}/dashboard` : "/workspaces"}
              className="flex items-center gap-2 text-xl font-bold tracking-tight text-white hover:text-indigo-400 transition"
            >
              <span className="text-2xl">⚽</span>
              <span>ClubPost</span>
            </Link>

            {workspaceId && workspaces.length > 0 && (
              <WorkspaceSwitcher
                workspaces={workspaces}
                activeWorkspaceId={workspaceId}
              />
            )}
          </div>

          {/* Right side items */}
          <div className="flex items-center gap-4">
            <ApiUsageBadge />

            {userEmail ? (
              <div className="flex items-center gap-3 border-l border-gray-700 pl-4">
                <span className="text-xs text-gray-400 hidden sm:inline max-w-[120px] truncate" title={userEmail}>
                  {userEmail}
                </span>
                <button
                  onClick={async () => {
                    await onLogout();
                    navigate("/login");
                  }}
                  className="text-xs px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition font-medium"
                >
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Workspace Sub-navigation bar */}
        {workspaceId && (
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 border-t border-gray-700/50 text-sm">
            {navLinks.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                    active
                      ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-semibold"
                      : "text-gray-400 hover:text-gray-100 hover:bg-gray-700/40"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
};

