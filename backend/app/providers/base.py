"""Abstract Base Class and data models for Football Data Providers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class ProviderTeam:
    """Represents a football team returned by a data provider."""

    id: str
    name: str
    short_name: str | None = None
    country: str | None = None
    league_id: str | None = None
    league_name: str | None = None
    badge_url: str | None = None


@dataclass
class ProviderMatchEvent:
    """Represents a key match event (goal, card, substitution, etc.)."""

    id: str
    event_type: str  # goal, penalty, red_card, yellow_card, substitution, halftime, fulltime
    minute: int
    player_name: str | None = None
    team_name: str | None = None
    event_detail: str | None = None  # e.g., "Assisted by Player B", "Second yellow"


@dataclass
class ProviderMatch:
    """Represents a football match returned by a data provider."""

    id: str
    home_team_id: str
    home_team_name: str
    away_team_id: str
    away_team_name: str
    kickoff_time: datetime
    status: str  # scheduled, live, halftime, finished, postponed, cancelled
    league_name: str | None = None
    venue: str | None = None
    home_score: int | None = None
    away_score: int | None = None
    minute: int | None = None
    events: list[ProviderMatchEvent] = field(default_factory=list)
    raw_data: dict[str, Any] = field(default_factory=dict)


class FootballDataProvider(ABC):
    """Abstract interface that all football data providers (Mock, API-Football, etc.) must implement."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g. 'mock', 'football-data', 'api-football')."""
        pass

    @abstractmethod
    def search_teams(self, query: str) -> list[ProviderTeam]:
        """Search for teams matching the query string."""
        pass

    @abstractmethod
    def get_team(self, team_id: str) -> ProviderTeam | None:
        """Fetch details of a specific team by provider team ID."""
        pass

    @abstractmethod
    def get_team_fixtures(self, team_id: str) -> list[ProviderMatch]:
        """Fetch upcoming scheduled fixtures for a given team."""
        pass

    @abstractmethod
    def get_team_recent_results(self, team_id: str) -> list[ProviderMatch]:
        """Fetch recent finished match results for a given team."""
        pass

    @abstractmethod
    def get_live_match_for_team(self, team_id: str) -> ProviderMatch | None:
        """Fetch current live match for a given team if one is in progress, else None."""
        pass

    @abstractmethod
    def get_match_events(self, match_id: str) -> list[ProviderMatchEvent]:
        """Fetch all events for a specific match."""
        pass

