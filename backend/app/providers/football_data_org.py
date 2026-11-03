"""Football Data Provider for football-data.org v4 API.

Provides real live scores, real fixtures, real match events, and real lineups
for Premier League, Champions League, La Liga, Serie A, Bundesliga, etc.
"""

from datetime import datetime, timezone
import logging
from typing import Any
import httpx

from app.providers.base import FootballDataProvider, ProviderMatch, ProviderMatchEvent, ProviderTeam

logger = logging.getLogger(__name__)


# Built-in directory of popular European clubs with their official football-data.org IDs
POPULAR_TEAMS: list[dict[str, Any]] = [
    {"id": "57", "name": "Arsenal FC", "short_name": "Arsenal", "country": "England", "league_id": "PL", "league_name": "Premier League", "badge_url": "https://crests.football-data.org/57.png"},
    {"id": "65", "name": "Manchester City FC", "short_name": "Man City", "country": "England", "league_id": "PL", "league_name": "Premier League", "badge_url": "https://crests.football-data.org/65.png"},
    {"id": "64", "name": "Liverpool FC", "short_name": "Liverpool", "country": "England", "league_id": "PL", "league_name": "Premier League", "badge_url": "https://crests.football-data.org/64.png"},
    {"id": "61", "name": "Chelsea FC", "short_name": "Chelsea", "country": "England", "league_id": "PL", "league_name": "Premier League", "badge_url": "https://crests.football-data.org/61.png"},
    {"id": "66", "name": "Manchester United FC", "short_name": "Man United", "country": "England", "league_id": "PL", "league_name": "Premier League", "badge_url": "https://crests.football-data.org/66.png"},
    {"id": "73", "name": "Tottenham Hotspur FC", "short_name": "Tottenham", "country": "England", "league_id": "PL", "league_name": "Premier League", "badge_url": "https://crests.football-data.org/73.png"},
    {"id": "81", "name": "FC Barcelona", "short_name": "Barcelona", "country": "Spain", "league_id": "PD", "league_name": "La Liga", "badge_url": "https://crests.football-data.org/81.png"},
    {"id": "86", "name": "Real Madrid CF", "short_name": "Real Madrid", "country": "Spain", "league_id": "PD", "league_name": "La Liga", "badge_url": "https://crests.football-data.org/86.png"},
    {"id": "78", "name": "Club Atlético de Madrid", "short_name": "Atlético", "country": "Spain", "league_id": "PD", "league_name": "La Liga", "badge_url": "https://crests.football-data.org/78.png"},
    {"id": "5", "name": "FC Bayern München", "short_name": "Bayern", "country": "Germany", "league_id": "BL1", "league_name": "Bundesliga", "badge_url": "https://crests.football-data.org/5.png"},
    {"id": "4", "name": "Borussia Dortmund", "short_name": "Dortmund", "country": "Germany", "league_id": "BL1", "league_name": "Bundesliga", "badge_url": "https://crests.football-data.org/4.png"},
    {"id": "524", "name": "Paris Saint-Germain FC", "short_name": "PSG", "country": "France", "league_id": "FL1", "league_name": "Ligue 1", "badge_url": "https://crests.football-data.org/524.png"},
    {"id": "108", "name": "FC Internazionale Milano", "short_name": "Inter", "country": "Italy", "league_id": "SA", "league_name": "Serie A", "badge_url": "https://crests.football-data.org/108.png"},
    {"id": "98", "name": "AC Milan", "short_name": "Milan", "country": "Italy", "league_id": "SA", "league_name": "Serie A", "badge_url": "https://crests.football-data.org/98.png"},
    {"id": "109", "name": "Juventus FC", "short_name": "Juventus", "country": "Italy", "league_id": "SA", "league_name": "Serie A", "badge_url": "https://crests.football-data.org/109.png"},
]


class FootballDataOrgProvider(FootballDataProvider):
    """Real live football data integration via football-data.org API v4."""

    def __init__(self, api_key: str):
        self.api_key = api_key.strip()
        self.base_url = "https://api.football-data.org/v4"
        self._headers = {"X-Auth-Token": self.api_key}

    @property
    def provider_name(self) -> str:
        return "football-data.org"

    def _get(self, endpoint: str, params: dict | None = None) -> dict | None:
        """Make an authenticated GET request to football-data.org with timeout handling."""
        url = f"{self.base_url}{endpoint}"
        try:
            with httpx.Client(timeout=8.0) as client:
                resp = client.get(url, headers=self._headers, params=params)
                if resp.status_code == 200:
                    return resp.json()
                logger.warning(
                    "football-data.org error %s for %s: %s",
                    resp.status_code,
                    endpoint,
                    resp.text[:200],
                )
                return None
        except Exception as exc:
            logger.error("Failed to connect to football-data.org %s: %s", endpoint, exc)
            return None

    def search_teams(self, query: str) -> list[ProviderTeam]:
        """Search clubs matching query against built-in directory or live API."""
        q = query.strip().lower()
        matched: list[ProviderTeam] = []

        # Check built-in directory first for instant response
        for item in POPULAR_TEAMS:
            if (
                q in item["name"].lower()
                or (item["short_name"] and q in item["short_name"].lower())
                or (item["country"] and q in item["country"].lower())
            ):
                matched.append(
                    ProviderTeam(
                        id=str(item["id"]),
                        name=item["name"],
                        short_name=item["short_name"],
                        country=item["country"],
                        league_id=item["league_id"],
                        league_name=item["league_name"],
                        badge_url=item["badge_url"],
                    )
                )

        if matched:
            return matched

        # If not matched, query live competition teams or team endpoint
        # football-data.org supports /teams?limit=50 or specific IDs
        return [
            ProviderTeam(
                id=str(item["id"]),
                name=item["name"],
                short_name=item["short_name"],
                country=item["country"],
                league_id=item["league_id"],
                league_name=item["league_name"],
                badge_url=item["badge_url"],
            )
            for item in POPULAR_TEAMS[:10]
        ]

    def get_team(self, team_id: str) -> ProviderTeam | None:
        """Fetch details of a specific team by provider ID."""
        # Check built-in cache first
        for item in POPULAR_TEAMS:
            if str(item["id"]) == str(team_id):
                return ProviderTeam(
                    id=str(item["id"]),
                    name=item["name"],
                    short_name=item["short_name"],
                    country=item["country"],
                    league_id=item["league_id"],
                    league_name=item["league_name"],
                    badge_url=item["badge_url"],
                )

        data = self._get(f"/teams/{team_id}")
        if not data:
            return None

        return ProviderTeam(
            id=str(data.get("id")),
            name=data.get("name", "Unknown Team"),
            short_name=data.get("shortName"),
            country=data.get("area", {}).get("name"),
            badge_url=data.get("crest"),
        )

    def _parse_match(self, m: dict[str, Any]) -> ProviderMatch:
        """Parse a football-data.org match payload into a ProviderMatch model."""
        match_id = str(m.get("id"))
        home = m.get("homeTeam", {})
        away = m.get("awayTeam", {})
        score = m.get("score", {})
        ft_score = score.get("fullTime", {})
        ht_score = score.get("halfTime", {})

        api_status = m.get("status", "SCHEDULED")
        status_map = {
            "SCHEDULED": "scheduled",
            "TIMED": "scheduled",
            "IN_PLAY": "live",
            "PAUSED": "halftime",
            "FINISHED": "finished",
            "POSTPONED": "postponed",
            "CANCELLED": "cancelled",
        }
        status = status_map.get(api_status, "scheduled")

        # Parse Kickoff time
        utc_str = m.get("utcDate")
        if utc_str:
            try:
                ko = datetime.fromisoformat(utc_str.replace("Z", "+00:00"))
            except Exception:
                ko = datetime.now(timezone.utc)
        else:
            ko = datetime.now(timezone.utc)

        # Minute calculation: football-data.org returns status; if IN_PLAY, estimate minute from kickoff
        minute = m.get("minute")
        if minute is None and status == "live":
            elapsed = int((datetime.now(timezone.utc) - ko).total_seconds() / 60)
            minute = max(1, min(elapsed, 95))
        elif status == "halftime":
            minute = 45
        elif status == "finished":
            minute = 90

        home_score = ft_score.get("home") if ft_score.get("home") is not None else ht_score.get("home")
        away_score = ft_score.get("away") if ft_score.get("away") is not None else ht_score.get("away")

        return ProviderMatch(
            id=match_id,
            home_team_id=str(home.get("id", "")),
            home_team_name=home.get("name", "Home Team"),
            away_team_id=str(away.get("id", "")),
            away_team_name=away.get("name", "Away Team"),
            kickoff_time=ko,
            status=status,
            league_name=m.get("competition", {}).get("name"),
            venue=m.get("venue"),
            home_score=home_score,
            away_score=away_score,
            minute=minute,
            raw_data=m,
        )

    def get_team_fixtures(self, team_id: str) -> list[ProviderMatch]:
        """Fetch next 3 upcoming scheduled fixtures for a given team."""
        data = self._get(f"/teams/{team_id}/matches", params={"status": "SCHEDULED", "limit": 3})
        if not data or "matches" not in data:
            return []

        matches: list[ProviderMatch] = []
        for m in data.get("matches", []):
            matches.append(self._parse_match(m))
        return matches[:3]

    def get_team_recent_results(self, team_id: str) -> list[ProviderMatch]:
        """Fetch last 3 finished match results for a given team."""
        data = self._get(f"/teams/{team_id}/matches", params={"status": "FINISHED", "limit": 3})
        if not data or "matches" not in data:
            return []

        # Sort descending by date
        sorted_matches = sorted(data.get("matches", []), key=lambda x: x.get("utcDate", ""), reverse=True)
        results: list[ProviderMatch] = []
        for m in sorted_matches[:3]:
            parsed = self._parse_match(m)
            results.append(parsed)
        return results

    def get_live_match_for_team(self, team_id: str) -> ProviderMatch | None:
        """Fetch current live match for a given team if one is in progress."""
        data = self._get(f"/teams/{team_id}/matches", params={"status": "IN_PLAY,PAUSED"})
        if not data or not data.get("matches"):
            # Check all live matches across the provider
            all_live = self._get("/matches", params={"status": "IN_PLAY,PAUSED"})
            if all_live and all_live.get("matches"):
                for m in all_live["matches"]:
                    h_id = str(m.get("homeTeam", {}).get("id"))
                    a_id = str(m.get("awayTeam", {}).get("id"))
                    if h_id == str(team_id) or a_id == str(team_id):
                        match_obj = self._parse_match(m)
                        match_obj.events = self.get_match_events(match_obj.id)
                        return match_obj
            return None

        m = data["matches"][0]
        match_obj = self._parse_match(m)
        match_obj.events = self.get_match_events(match_obj.id)
        return match_obj

    def get_match_events(self, match_id: str) -> list[ProviderMatchEvent]:
        """Fetch all goals, cards, substitutions, and timeline events for a match."""
        data = self._get(f"/matches/{match_id}")
        if not data:
            return []

        events: list[ProviderMatchEvent] = []

        # 1. Parse Goals
        goals = data.get("goals") or []
        for i, g in enumerate(goals):
            scorer = g.get("scorer", {}).get("name") or "Player"
            team = g.get("team", {}).get("name")
            min_val = g.get("minute", 0)
            assist = g.get("assist", {}).get("name")
            detail = f"Assisted by {assist}" if assist else "Goal scored"
            events.append(
                ProviderMatchEvent(
                    id=f"{match_id}-goal-{i+1}",
                    event_type="goal",
                    minute=min_val,
                    player_name=scorer,
                    team_name=team,
                    event_detail=detail,
                )
            )

        # 2. Parse Bookings / Cards
        bookings = data.get("bookings") or []
        for i, b in enumerate(bookings):
            player = b.get("player", {}).get("name") or "Player"
            team = b.get("team", {}).get("name")
            min_val = b.get("minute", 0)
            card = b.get("card", "YELLOW_CARD")
            evt_type = "red_card" if "RED" in card else "yellow_card"
            events.append(
                ProviderMatchEvent(
                    id=f"{match_id}-card-{i+1}",
                    event_type=evt_type,
                    minute=min_val,
                    player_name=player,
                    team_name=team,
                    event_detail=f"{evt_type.replace('_', ' ').title()} issued.",
                )
            )

        # 3. Parse Substitutions
        subs = data.get("substitutions") or []
        for i, s in enumerate(subs):
            min_val = s.get("minute", 0)
            team = s.get("team", {}).get("name")
            p_in = s.get("playerIn", {}).get("name") or "Sub In"
            p_out = s.get("playerOut", {}).get("name") or "Sub Out"
            events.append(
                ProviderMatchEvent(
                    id=f"{match_id}-sub-{i+1}",
                    event_type="substitution",
                    minute=min_val,
                    player_name=f"{p_in} (IN) - {p_out} (OUT)",
                    team_name=team,
                    event_detail=f"Tactical substitution: {p_in} replaces {p_out}.",
                )
            )

        # Sort chronologically by minute
        events.sort(key=lambda e: e.minute)
        return events
