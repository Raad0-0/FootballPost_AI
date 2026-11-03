import { apiRequest } from "./client";
import type { PostDraft, PostDraftCreatePayload, PostDraftUpdatePayload } from "../types/draft";

export async function getDrafts(
  workspaceId: number | string,
  filters?: { status?: string; post_type?: string }
): Promise<PostDraft[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.post_type) params.append("post_type", filters.post_type);

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<PostDraft[]>(`/api/workspaces/${workspaceId}/drafts${query}`);
}

export async function createDraft(
  workspaceId: number | string,
  payload: PostDraftCreatePayload
): Promise<PostDraft> {
  return apiRequest<PostDraft>(`/api/workspaces/${workspaceId}/drafts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


export async function updateDraft(
  draftId: number | string,
  payload: PostDraftUpdatePayload
): Promise<PostDraft> {
  return apiRequest<PostDraft>(`/api/drafts/${draftId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteDraft(draftId: number | string): Promise<void> {
  return apiRequest<void>(`/api/drafts/${draftId}`, {
    method: "DELETE",
  });
}

