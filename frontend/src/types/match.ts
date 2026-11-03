export interface MatchEvent {
  id: number;
  match_id: number;
  event_type: string;
  minute?: number | null;
  player_name?: string | null;
  team_name?: string | null;
  event_detail?: string | null;
  created_at: string;
}

export interface PlayerLineupItem {
  number: number;
  name: string;
  pos: string;
  captain?: boolean;
}

export interface TeamNews {
  starting_changes?: string[];
  missing_players?: string[];
  tactical_notes?: string;
}

export interface MatchLineups {
  home_formation: string;
  away_formation: string;
  is_confirmed?: boolean;
  lineup_status?: "confirmed" | "provisional" | string;
  status_badge?: string;
  release_note?: string;
  home_starting_xi: PlayerLineupItem[];
  home_bench: string[];
  home_team_news: TeamNews;
  away_starting_xi: PlayerLineupItem[];
  away_bench: string[];
  away_team_news: TeamNews;
}

export interface MatchAnalysis {
  man_of_the_match: string;
  motm_role?: string;
  motm_stat: string;
  rating: string;
  summary: string;
  coach_quote?: string;
  key_stats: {
    possession: string;
    shots: string;
    xg: string;
    pass_accuracy: string;
    corners: string;
    fouls: string;
  };
  tactical_takeaways: string[];
  season_impact: string;
}

export interface Match {
  id: number | string;
  workspace_id: number;
  provider_match_id: string;
  home_team: string;
  away_team: string;
  kickoff_time?: string | null;
  status: string;
  home_score?: number | null;
  away_score?: number | null;
  minute?: number | null;
  league_name?: string | null;
  venue?: string | null;
  events?: MatchEvent[];
  lineups?: MatchLineups | null;
  analysis?: MatchAnalysis | null;
}

export interface ManualFetchResult {
  match?: Match | null;
  new_drafts_count: number;
  new_drafts: Array<{
    id: number;
    post_type: string;
    content: string;
    status: string;
  }>;
  message: string;
}

