"""Pydantic v2 schemas for team search, tracked teams, and dashboard aggregation."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class TeamSearchResult(BaseModel):
    """Team result returned from football data provider search."""

    id: str
    name: str
    short_name: str | None = None
    country: str | None = None
    league_id: str | None = None
    league_name: str | None = None


class TrackedTeamCreate(BaseModel):
    """Payload to select and track a team for a workspace."""

    provider_name: str = Field(default="mock", description="Football data provider identifier")
    provider_team_id: str = Field(..., description="Provider's team ID")
    team_name: str = Field(..., description="Full club name")
    league_id: str | None = None
    country: str | None = None
    is_primary_team: bool = True


class TrackedTeamResponse(BaseModel):
    """Response model for a tracked team."""

    id: int
    workspace_id: int
    provider_name: str
    provider_team_id: str
    team_name: str
    league_id: str | None = None
    country: str | None = None
    is_primary_team: bool

    model_config = ConfigDict(from_attributes=True)


class MatchSummary(BaseModel):
    """Simplified match representation for dashboard cards."""

    id: str
    home_team: str
    away_team: str
    kickoff_time: datetime
    status: str  # scheduled, live, halftime, finished, etc.
    home_score: int | None = None
    away_score: int | None = None
    minute: int | None = None
    league_name: str | None = None
    venue: str | None = None


class DashboardResponse(BaseModel):
    """Workspace dashboard data summary."""

    workspace_id: int
    workspace_name: str
    tracked_team: TrackedTeamResponse | None = None
    next_fixture: MatchSummary | None = None
    recent_result: MatchSummary | None = None
    live_match: MatchSummary | None = None
    upcoming_fixtures: list[MatchSummary] = Field(default_factory=list)
    recent_results: list[MatchSummary] = Field(default_factory=list)
    recent_drafts_count: int = 0
    api_usage: dict


class ClubJourneyResponse(BaseModel):
    """Club historical performance and season comparison."""

    club_name: str
    stadium: str
    manager: str
    league: str
    founded: int | None = None
    previous_season: dict
    current_season: dict
    comparison: dict

