import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Workspace } from "../types/workspace";

interface Props {
  workspaces: Workspace[];
  activeWorkspaceId: number | string;
}

export const WorkspaceSwitcher: React.FC<Props> = ({
  workspaces,
  activeWorkspaceId,
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const activeWs = workspaces.find((w) => String(w.id) === String(activeWorkspaceId));

  const handleSelect = (wsId: number) => {
    setOpen(false);
    navigate(`/workspace/${wsId}/dashboard`);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-1.5 rounded-lg border border-gray-700 text-sm font-medium transition shadow-sm"
      >
        <span className="text-emerald-400">🛡️</span>
        <span className="max-w-[160px] truncate">{activeWs?.workspace_name || "Select Workspace"}</span>
        <span className="text-gray-400 text-xs">▼</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-64 rounded-xl bg-gray-800 border border-gray-700 shadow-2xl z-50 py-1 overflow-hidden">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700/60">
              Club Workspaces ({workspaces.length})
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {workspaces.map((ws) => {
                const isSelected = String(ws.id) === String(activeWorkspaceId);
                return (
                  <button
                    key={ws.id}
                    onClick={() => handleSelect(ws.id)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition ${
                      isSelected
                        ? "bg-emerald-950/60 text-emerald-300 font-semibold border-l-2 border-emerald-500"
                        : "text-gray-200 hover:bg-gray-700/60"
                    }`}
                  >
                    <span className="truncate">{ws.workspace_name}</span>
                    {isSelected && <span className="text-emerald-400 text-xs">Active</span>}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-gray-700/60 p-2">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/workspaces");
                }}
                className="w-full text-center text-xs py-1.5 text-emerald-400 hover:text-emerald-300 font-medium hover:bg-gray-700/40 rounded transition"
              >
                + Manage & Create Workspaces
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

