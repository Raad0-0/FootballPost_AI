import { useEffect, useState } from "react";
import { createWorkspace, deleteWorkspace, getWorkspaces, updateWorkspace } from "../api/workspaces";
import type { Workspace, WorkspaceCreatePayload } from "../types/workspace";

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const data = await getWorkspaces();
      setWorkspaces(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const addWorkspace = async (payload: string | WorkspaceCreatePayload) => {
    const body = typeof payload === "string" ? { workspace_name: payload } : payload;
    const newWs = await createWorkspace(body);
    setWorkspaces((prev) => [newWs, ...prev]);
    return newWs;
  };

  const renameWorkspace = async (id: number, name: string) => {
    const updated = await updateWorkspace(id, { workspace_name: name });
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? updated : w)));
    return updated;
  };

  const removeWorkspace = async (id: number) => {
    await deleteWorkspace(id);
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
  };

  return {
    workspaces,
    loading,
    error,
    refresh: fetchWorkspaces,
    addWorkspace,
    renameWorkspace,
    removeWorkspace,
  };
}

