import { apiRequest } from "./client";
import type { ManualFetchResult, Match } from "../types/match";

export async function getMatches(workspaceId: number | string): Promise<Match[]> {
  return apiRequest<Match[]>(`/api/workspaces/${workspaceId}/matches`);
}

export async function getMatch(
  workspaceId: number | string,
  matchId: number | string
): Promise<Match> {
  return apiRequest<Match>(`/api/workspaces/${workspaceId}/matches/${matchId}`);
}

export async function fetchLiveMatchNow(workspaceId: number | string): Promise<ManualFetchResult> {
  return apiRequest<ManualFetchResult>(`/api/workspaces/${workspaceId}/matches/live/fetch-now`, {
    method: "POST",
  });
}

export async function fetchMatchNow(
  workspaceId: number | string,
  matchId: number | string
): Promise<ManualFetchResult> {
  return apiRequest<ManualFetchResult>(`/api/workspaces/${workspaceId}/matches/${matchId}/fetch-now`, {
    method: "POST",
  });
}

