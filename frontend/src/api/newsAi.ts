import { apiRequest } from "./client";
import type { ClubNews, AIPostGenerateRequest, AIPostGenerateResponse } from "../types/ai";

export async function getClubNews(
  workspaceId: number | string,
  forceRefresh: boolean = false
): Promise<ClubNews[]> {
  const query = forceRefresh ? "?force_refresh=true" : "";
  return apiRequest<ClubNews[]>(`/api/workspaces/${workspaceId}/news${query}`);
}

export async function generateAIPost(
  workspaceId: number | string,
  payload: AIPostGenerateRequest
): Promise<AIPostGenerateResponse> {
  return apiRequest<AIPostGenerateResponse>(`/api/workspaces/${workspaceId}/ai/generate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

