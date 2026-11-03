import { apiRequest } from "./client";
import type { Workspace, WorkspaceCreatePayload, WorkspaceUpdatePayload } from "../types/workspace";

export async function getWorkspaces(): Promise<Workspace[]> {
  return apiRequest<Workspace[]>("/api/workspaces");
}

export async function createWorkspace(payload: WorkspaceCreatePayload): Promise<Workspace> {
  return apiRequest<Workspace>("/api/workspaces", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getWorkspace(workspaceId: number | string): Promise<Workspace> {
  return apiRequest<Workspace>(`/api/workspaces/${workspaceId}`);
}

export async function updateWorkspace(
  workspaceId: number | string,
  payload: WorkspaceUpdatePayload
): Promise<Workspace> {
  return apiRequest<Workspace>(`/api/workspaces/${workspaceId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteWorkspace(workspaceId: number | string): Promise<void> {
  return apiRequest<void>(`/api/workspaces/${workspaceId}`, {
    method: "DELETE",
  });
}

