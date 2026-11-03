"""Pydantic v2 schemas for matches and match events."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class MatchEventResponse(BaseModel):
    """Event detail within a match."""

    id: int
    match_id: int
    event_type: str
    minute: int | None = None
    player_name: str | None = None
    team_name: str | None = None
    event_detail: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MatchResponse(BaseModel):
    """Match summary response."""

    id: int
    workspace_id: int
    provider_match_id: str
    home_team: str
    away_team: str
    kickoff_time: datetime | None = None
    status: str
    home_score: int | None = None
    away_score: int | None = None
    minute: int | None = None
    league_name: str | None = None
    venue: str | None = None

    model_config = ConfigDict(from_attributes=True)


class MatchDetailResponse(MatchResponse):
    """Match response including associated events, lineups, and analysis data."""

    events: list[MatchEventResponse] = []
    lineups: dict | None = None
    analysis: dict | None = None


class ManualFetchResponse(BaseModel):
    """Result of a manual 'Fetch now' trigger."""

    match: MatchResponse | None = None
    new_drafts_count: int
    new_drafts: list[dict]
    message: str

