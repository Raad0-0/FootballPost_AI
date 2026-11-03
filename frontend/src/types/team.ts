export interface TeamSearchResult {
  id: string;
  name: string;
  short_name?: string | null;
  country?: string | null;
  league_id?: string | null;
  league_name?: string | null;
}

export interface TrackedTeam {
  id: number;
  workspace_id: number;
  provider_name: string;
  provider_team_id: string;
  team_name: string;
  league_id?: string | null;
  country?: string | null;
  is_primary_team: boolean;
}

export interface TrackedTeamCreatePayload {
  provider_name: string;
  provider_team_id: string;
  team_name: string;
  league_id?: string | null;
  country?: string | null;
  is_primary_team?: boolean;
}

export interface MatchSummary {
  id: string | number;
  home_team: string;
  away_team: string;
  kickoff_time?: string | null;
  status: string;
  home_score?: number | null;
  away_score?: number | null;
  minute?: number | null;
  league_name?: string | null;
  venue?: string | null;
}

export interface DashboardData {
  workspace_id: number;
  workspace_name: string;
  tracked_team?: TrackedTeam | null;
  next_fixture?: MatchSummary | null;
  recent_result?: MatchSummary | null;
  live_match?: MatchSummary | null;
  upcoming_fixtures?: MatchSummary[];
  recent_results?: MatchSummary[];
  recent_drafts_count: number;
  api_usage: {
    daily_limit: number;
    used_today: number;
    remaining: number;
    percentage: number;
    status: "ok" | "warning" | "critical" | "blocked";
    warning_message?: string | null;
  };
}

export interface ClubJourneyData {
  club_name: string;
  stadium: string;
  manager: string;
  league: string;
  founded?: number | null;
  previous_season: {
    season: string;
    league_finish: string;
    points: number;
    matches_played: number;
    won: number;
    drawn: number;
    lost: number;
    goals_for: number;
    goals_against: number;
    goal_difference: string;
    clean_sheets?: number;
    top_scorer?: string;
    notable_moments?: string;
  };
  current_season: {
    season: string;
    league_position: string;
    points: number;
    matches_played: number;
    won: number;
    drawn: number;
    lost: number;
    goals_for: number;
    goals_against: number;
    goal_difference: string;
    form?: string[];
  };
  comparison: {
    points_pace: string;
    goals_per_game: string;
    defensive_record: string;
    takeaway: string;
  };
}


