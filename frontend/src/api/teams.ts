import { apiRequest } from "./client";
import type { ClubJourneyData, DashboardData, TeamSearchResult, TrackedTeam, TrackedTeamCreatePayload } from "../types/team";

export async function searchTeams(
  workspaceId: number | string,
  query: string = ""
): Promise<TeamSearchResult[]> {
  const q = encodeURIComponent(query);
  return apiRequest<TeamSearchResult[]>(`/api/workspaces/${workspaceId}/teams/search?q=${q}`);
}

export async function getTrackedTeam(workspaceId: number | string): Promise<TrackedTeam> {
  return apiRequest<TrackedTeam>(`/api/workspaces/${workspaceId}/tracked-team`);
}

export async function setTrackedTeam(
  workspaceId: number | string,
  payload: TrackedTeamCreatePayload
): Promise<TrackedTeam> {
  return apiRequest<TrackedTeam>(`/api/workspaces/${workspaceId}/tracked-team`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getDashboard(workspaceId: number | string): Promise<DashboardData> {
  return apiRequest<DashboardData>(`/api/workspaces/${workspaceId}/dashboard`);
}

export async function getClubJourney(workspaceId: number | string): Promise<ClubJourneyData> {
  return apiRequest<ClubJourneyData>(`/api/workspaces/${workspaceId}/club-journey`);
}


