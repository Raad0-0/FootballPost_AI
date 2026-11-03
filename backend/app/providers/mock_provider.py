"""Mock Football Data Provider for local development and quota-free testing."""

from datetime import datetime, timedelta, timezone
from app.providers.base import (
    FootballDataProvider,
    ProviderMatch,
    ProviderMatchEvent,
    ProviderTeam,
)


class MockFootballDataProvider(FootballDataProvider):
    """In-memory realistic mock provider that supplies teams, fixtures, results,

    and simulated live match states without hitting external APIs.
    """

    def __init__(self) -> None:
        self._provider_name = "mock"
        self._teams: dict[str, ProviderTeam] = {
            "mock-arsenal": ProviderTeam(
                id="mock-arsenal",
                name="Arsenal FC",
                short_name="Arsenal",
                country="England",
                league_id="PL",
                league_name="Premier League",
            ),
            "mock-mancity": ProviderTeam(
                id="mock-mancity",
                name="Manchester City",
                short_name="Man City",
                country="England",
                league_id="PL",
                league_name="Premier League",
            ),
            "mock-chelsea": ProviderTeam(
                id="mock-chelsea",
                name="Chelsea FC",
                short_name="Chelsea",
                country="England",
                league_id="PL",
                league_name="Premier League",
            ),
            "mock-liverpool": ProviderTeam(
                id="mock-liverpool",
                name="Liverpool FC",
                short_name="Liverpool",
                country="England",
                league_id="PL",
                league_name="Premier League",
            ),
            "mock-realmadrid": ProviderTeam(
                id="mock-realmadrid",
                name="Real Madrid CF",
                short_name="Real Madrid",
                country="Spain",
                league_id="PD",
                league_name="La Liga",
            ),
            "mock-barcelona": ProviderTeam(
                id="mock-barcelona",
                name="FC Barcelona",
                short_name="Barcelona",
                country="Spain",
                league_id="PD",
                league_name="La Liga",
            ),
            "mock-bayern": ProviderTeam(
                id="mock-bayern",
                name="Bayern Munich",
                short_name="Bayern",
                country="Germany",
                league_id="BL1",
                league_name="Bundesliga",
            ),
            "mock-psg": ProviderTeam(
                id="mock-psg",
                name="Paris Saint-Germain",
                short_name="PSG",
                country="France",
                league_id="FL1",
                league_name="Ligue 1",
            ),
        }

        # Dynamic simulation state for live matches
        # Map: team_id -> live match object
        self._live_matches: dict[str, ProviderMatch] = {}
        self._init_default_live_match()

    def reset(self) -> None:
        """Reset the mock provider's simulated matches to initial default state."""
        self._live_matches.clear()
        self._init_default_live_match()

    @property
    def provider_name(self) -> str:
        return self._provider_name

    def _init_default_live_match(self) -> None:
        """Initialize a default simulated live match for Arsenal vs Chelsea."""
        now = datetime.now(timezone.utc)
        live_match = ProviderMatch(
            id="mock-match-live-1",
            home_team_id="mock-arsenal",
            home_team_name="Arsenal FC",
            away_team_id="mock-chelsea",
            away_team_name="Chelsea FC",
            kickoff_time=now - timedelta(minutes=38),
            status="live",
            league_name="Premier League",
            venue="Emirates Stadium",
            home_score=1,
            away_score=0,
            minute=38,
            events=[
                ProviderMatchEvent(
                    id="mock-evt-1",
                    event_type="goal",
                    minute=23,
                    player_name="Bukayo Saka",
                    team_name="Arsenal FC",
                    event_detail="Left-footed shot from inside the box into the top corner.",
                ),
                ProviderMatchEvent(
                    id="mock-evt-2",
                    event_type="yellow_card",
                    minute=31,
                    player_name="Moises Caicedo",
                    team_name="Chelsea FC",
                    event_detail="Tactical foul in the midfield.",
                ),
                ProviderMatchEvent(
                    id="mock-evt-3",
                    event_type="substitution",
                    minute=35,
                    player_name="Malo Gusto (IN) - Reece James (OUT)",
                    team_name="Chelsea FC",
                    event_detail="Tactical substitution: Reece James unable to continue.",
                ),
            ],
            raw_data={"simulated": True, "source": "MockFootballDataProvider"},
        )
        self._live_matches["mock-arsenal"] = live_match
        self._live_matches["mock-chelsea"] = live_match

    def search_teams(self, query: str) -> list[ProviderTeam]:
        """Search mock teams by case-insensitive name, short name, or country."""
        q = query.strip().lower()
        if not q:
            return list(self._teams.values())

        results: list[ProviderTeam] = []
        for team in self._teams.values():
            if (
                q in team.name.lower()
                or (team.short_name and q in team.short_name.lower())
                or (team.country and q in team.country.lower())
                or (team.league_name and q in team.league_name.lower())
            ):
                results.append(team)
        return results

    def get_team(self, team_id: str) -> ProviderTeam | None:
        """Get team by provider ID."""
        return self._teams.get(team_id)

    def get_team_fixtures(self, team_id: str) -> list[ProviderMatch]:
        """Return scheduled upcoming fixtures for the team."""
        team = self._teams.get(team_id)
        if not team:
            return []

        now = datetime.now(timezone.utc)
        fixtures: list[ProviderMatch] = []

        if team_id == "mock-arsenal":
            fixtures.append(
                ProviderMatch(
                    id="mock-match-fix-1",
                    home_team_id="mock-arsenal",
                    home_team_name="Arsenal FC",
                    away_team_id="mock-mancity",
                    away_team_name="Manchester City",
                    kickoff_time=now + timedelta(days=3, hours=4),
                    status="scheduled",
                    league_name="Premier League",
                    venue="Emirates Stadium",
                )
            )
            fixtures.append(
                ProviderMatch(
                    id="mock-match-fix-2",
                    home_team_id="mock-liverpool",
                    home_team_name="Liverpool FC",
                    away_team_id="mock-arsenal",
                    away_team_name="Arsenal FC",
                    kickoff_time=now + timedelta(days=8, hours=2),
                    status="scheduled",
                    league_name="Premier League",
                    venue="Anfield",
                )
            )
            fixtures.append(
                ProviderMatch(
                    id="mock-match-fix-3",
                    home_team_id="mock-arsenal",
                    home_team_name="Arsenal FC",
                    away_team_id="mock-chelsea",
                    away_team_name="Chelsea FC",
                    kickoff_time=now + timedelta(days=14, hours=1),
                    status="scheduled",
                    league_name="Premier League",
                    venue="Emirates Stadium",
                )
            )
        elif team_id == "mock-barcelona":
            fixtures.append(
                ProviderMatch(
                    id="mock-match-fix-4",
                    home_team_id="mock-realmadrid",
                    home_team_name="Real Madrid CF",
                    away_team_id="mock-barcelona",
                    away_team_name="FC Barcelona",
                    kickoff_time=now + timedelta(days=4, hours=6),
                    status="scheduled",
                    league_name="La Liga",
                    venue="Santiago Bernabéu",
                )
            )
            fixtures.append(
                ProviderMatch(
                    id="mock-match-fix-5",
                    home_team_id="mock-barcelona",
                    home_team_name="FC Barcelona",
                    away_team_id="mock-atletico",
                    away_team_name="Atlético Madrid",
                    kickoff_time=now + timedelta(days=10, hours=3),
                    status="scheduled",
                    league_name="La Liga",
                    venue="Spotify Camp Nou",
                )
            )
            fixtures.append(
                ProviderMatch(
                    id="mock-match-fix-6",
                    home_team_id="mock-sevilla",
                    home_team_name="Sevilla FC",
                    away_team_id="mock-barcelona",
                    away_team_name="FC Barcelona",
                    kickoff_time=now + timedelta(days=16, hours=5),
                    status="scheduled",
                    league_name="La Liga",
                    venue="Ramón Sánchez-Pizjuán",
                )
            )
        else:
            # Generic upcoming matches (3 matches)
            opponents = ["City Rivals", "United Warriors", "Athletic Stars"]
            for idx, opp in enumerate(opponents, 1):
                fixtures.append(
                    ProviderMatch(
                        id=f"mock-match-fix-{team_id}-{idx}",
                        home_team_id=team_id,
                        home_team_name=team.name,
                        away_team_id=f"mock-opp-{idx}",
                        away_team_name=opp,
                        kickoff_time=now + timedelta(days=3 * idx, hours=2),
                        status="scheduled",
                        league_name=team.league_name or "Championship",
                        venue="Home Arena",
                    )
                )

        return fixtures

    def get_team_recent_results(self, team_id: str) -> list[ProviderMatch]:
        """Return completed past matches with final scores."""
        team = self._teams.get(team_id)
        if not team:
            return []

        now = datetime.now(timezone.utc)
        results: list[ProviderMatch] = []

        if team_id == "mock-arsenal":
            results.append(
                ProviderMatch(
                    id="mock-match-res-1",
                    home_team_id="mock-arsenal",
                    home_team_name="Arsenal FC",
                    away_team_id="mock-liverpool",
                    away_team_name="Liverpool FC",
                    kickoff_time=now - timedelta(days=4),
                    status="finished",
                    league_name="Premier League",
                    venue="Emirates Stadium",
                    home_score=2,
                    away_score=1,
                    events=[
                        ProviderMatchEvent(
                            id="evt-res-1",
                            event_type="goal",
                            minute=14,
                            player_name="Bukayo Saka",
                            team_name="Arsenal FC",
                        ),
                        ProviderMatchEvent(
                            id="evt-res-2",
                            event_type="goal",
                            minute=53,
                            player_name="Virgil van Dijk",
                            team_name="Liverpool FC",
                        ),
                        ProviderMatchEvent(
                            id="evt-res-sub-1",
                            event_type="substitution",
                            minute=67,
                            player_name="Gabriel Jesus (IN) - Kai Havertz (OUT)",
                            team_name="Arsenal FC",
                            event_detail="Tactical attacking substitution.",
                        ),
                        ProviderMatchEvent(
                            id="evt-res-3",
                            event_type="goal",
                            minute=78,
                            player_name="Gabriel Martinelli",
                            team_name="Arsenal FC",
                        ),
                    ],
                )
            )
            results.append(
                ProviderMatch(
                    id="mock-match-res-ars-2",
                    home_team_id="mock-newcastle",
                    home_team_name="Newcastle United",
                    away_team_id="mock-arsenal",
                    away_team_name="Arsenal FC",
                    kickoff_time=now - timedelta(days=11),
                    status="finished",
                    league_name="Premier League",
                    venue="St. James' Park",
                    home_score=0,
                    away_score=2,
                    events=[
                        ProviderMatchEvent(
                            id="evt-res-4",
                            event_type="goal",
                            minute=33,
                            player_name="Kai Havertz",
                            team_name="Arsenal FC",
                        ),
                        ProviderMatchEvent(
                            id="evt-res-sub-2",
                            event_type="substitution",
                            minute=69,
                            player_name="Jorginho (IN) - Thomas Partey (OUT)",
                            team_name="Arsenal FC",
                            event_detail="Midfield tactical change.",
                        ),
                        ProviderMatchEvent(
                            id="evt-res-5",
                            event_type="goal",
                            minute=88,
                            player_name="Declan Rice",
                            team_name="Arsenal FC",
                        ),
                    ],
                )
            )
            results.append(
                ProviderMatch(
                    id="mock-match-res-ars-3",
                    home_team_id="mock-arsenal",
                    home_team_name="Arsenal FC",
                    away_team_id="mock-shakhtar",
                    away_team_name="Shakhtar Donetsk",
                    kickoff_time=now - timedelta(days=18),
                    status="finished",
                    league_name="Champions League",
                    venue="Emirates Stadium",
                    home_score=1,
                    away_score=0,
                    events=[
                        ProviderMatchEvent(
                            id="evt-res-6",
                            event_type="goal",
                            minute=29,
                            player_name="Gabriel Martinelli",
                            team_name="Arsenal FC",
                        ),
                        ProviderMatchEvent(
                            id="evt-res-sub-3",
                            event_type="substitution",
                            minute=72,
                            player_name="Mikel Merino (IN) - Declan Rice (OUT)",
                            team_name="Arsenal FC",
                            event_detail="Midfield rotation.",
                        ),
                    ],
                )
            )
        elif team_id == "mock-barcelona":
            results.append(
                ProviderMatch(
                    id="mock-match-res-2",
                    home_team_id="mock-barcelona",
                    home_team_name="FC Barcelona",
                    away_team_id="mock-bayern",
                    away_team_name="Bayern Munich",
                    kickoff_time=now - timedelta(days=4),
                    status="finished",
                    league_name="Champions League",
                    venue="Montjuïc Stadium",
                    home_score=4,
                    away_score=1,
                    events=[
                        ProviderMatchEvent(
                            id="evt-res-7",
                            event_type="goal",
                            minute=1,
                            player_name="Raphinha",
                            team_name="FC Barcelona",
                        ),
                        ProviderMatchEvent(
                            id="evt-res-8",
                            event_type="goal",
                            minute=36,
                            player_name="Robert Lewandowski",
                            team_name="FC Barcelona",
                        ),
                        ProviderMatchEvent(
                            id="evt-res-9",
                            event_type="goal",
                            minute=45,
                            player_name="Raphinha",
                            team_name="FC Barcelona",
                        ),
                        ProviderMatchEvent(
                            id="evt-res-10",
                            event_type="goal",
                            minute=56,
                            player_name="Raphinha",
                            team_name="FC Barcelona",
                        ),
                        ProviderMatchEvent(
                            id="evt-res-sub-4",
                            event_type="substitution",
                            minute=76,
                            player_name="Frenkie de Jong (IN) - Marc Casadó (OUT)",
                            team_name="FC Barcelona",
                            event_detail="Midfield control substitution.",
                        ),
                        ProviderMatchEvent(
                            id="evt-res-sub-5",
                            event_type="substitution",
                            minute=85,
                            player_name="Ansu Fati (IN) - Raphinha (OUT)",
                            team_name="FC Barcelona",
                            event_detail="Standing ovation for Raphinha after hat-trick.",
                        ),
                    ],
                )
            )
            results.append(
                ProviderMatch(
                    id="mock-match-res-bar-2",
                    home_team_id="mock-realmadrid",
                    home_team_name="Real Madrid CF",
                    away_team_id="mock-barcelona",
                    away_team_name="FC Barcelona",
                    kickoff_time=now - timedelta(days=9),
                    status="finished",
                    league_name="La Liga (El Clásico)",
                    venue="Santiago Bernabéu",
                    home_score=0,
                    away_score=4,
                    events=[
                        ProviderMatchEvent(
                            id="evt-res-11",
                            event_type="goal",
                            minute=54,
                            player_name="Robert Lewandowski",
                            team_name="FC Barcelona",
                        ),
                        ProviderMatchEvent(
                            id="evt-res-12",
                            event_type="goal",
                            minute=56,
                            player_name="Robert Lewandowski",
                            team_name="FC Barcelona",
                        ),
                        ProviderMatchEvent(
                            id="evt-res-13",
                            event_type="goal",
                            minute=77,
                            player_name="Lamine Yamal",
                            team_name="FC Barcelona",
                        ),
                        ProviderMatchEvent(
                            id="evt-res-14",
                            event_type="goal",
                            minute=84,
                            player_name="Raphinha",
                            team_name="FC Barcelona",
                        ),
                    ],
                )
            )
            results.append(
                ProviderMatch(
                    id="mock-match-res-bar-3",
                    home_team_id="mock-barcelona",
                    home_team_name="FC Barcelona",
                    away_team_id="mock-espanyol",
                    away_team_name="RCD Espanyol",
                    kickoff_time=now - timedelta(days=15),
                    status="finished",
                    league_name="La Liga",
                    venue="Montjuïc Stadium",
                    home_score=3,
                    away_score=1,
                    events=[
                        ProviderMatchEvent(
                            id="evt-res-15",
                            event_type="goal",
                            minute=12,
                            player_name="Dani Olmo",
                            team_name="FC Barcelona",
                        ),
                        ProviderMatchEvent(
                            id="evt-res-16",
                            event_type="goal",
                            minute=23,
                            player_name="Raphinha",
                            team_name="FC Barcelona",
                        ),
                        ProviderMatchEvent(
                            id="evt-res-17",
                            event_type="goal",
                            minute=31,
                            player_name="Dani Olmo",
                            team_name="FC Barcelona",
                        ),
                    ],
                )
            )
        else:
            # Generic past results (3 matches)
            opponents = ["Athletic United", "Southern Rovers", "Eastside Rangers"]
            for idx, opp in enumerate(opponents, 1):
                results.append(
                    ProviderMatch(
                        id=f"mock-match-res-{team_id}-{idx}",
                        home_team_id=team_id,
                        home_team_name=team.name,
                        away_team_id=f"mock-past-opp-{idx}",
                        away_team_name=opp,
                        kickoff_time=now - timedelta(days=5 * idx),
                        status="finished",
                        league_name=team.league_name or "League",
                        venue="Home Stadium",
                        home_score=2,
                        away_score=idx - 1,
                        events=[
                            ProviderMatchEvent(
                                id=f"evt-res-gen-{team_id}-{idx}-1",
                                event_type="goal",
                                minute=28,
                                player_name="Team Striker",
                                team_name=team.name,
                            ),
                            ProviderMatchEvent(
                                id=f"evt-res-gen-{team_id}-{idx}-2",
                                event_type="goal",
                                minute=72,
                                player_name="Midfield Ace",
                                team_name=team.name,
                            ),
                        ],
                    )
                )

        return results

    def get_live_match_for_team(self, team_id: str) -> ProviderMatch | None:
        """Return currently simulated active live match for the team, or None."""
        return self._live_matches.get(team_id)

    def get_match_events(self, match_id: str) -> list[ProviderMatchEvent]:
        """Fetch all events for a given match ID."""
        for match in self._live_matches.values():
            if match.id == match_id:
                return match.events
        return []

    def set_live_match_event(
        self, team_id: str, new_event: ProviderMatchEvent, home_score: int, away_score: int, minute: int, status: str = "live"
    ) -> ProviderMatch | None:
        """Helper for tests & simulations to push a new event into a live match."""
        match = self._live_matches.get(team_id)
        if not match:
            return None
        match.events.append(new_event)
        match.home_score = home_score
        match.away_score = away_score
        match.minute = minute
        match.status = status
        return match


# Provider singleton for fallback / mock usage
provider: FootballDataProvider = MockFootballDataProvider()


def get_football_provider() -> FootballDataProvider:
    """Dependency provider function for FastAPI routes and services.

    Dynamically selects between real FootballDataOrgProvider (if API key configured)
    or the rich offline MockFootballDataProvider.
    """
    from app.core.config import settings

    if settings.FOOTBALL_DATA_API_KEY and settings.FOOTBALL_PROVIDER in ("auto", "football-data"):
        from app.providers.football_data_org import FootballDataOrgProvider
        return FootballDataOrgProvider(api_key=settings.FOOTBALL_DATA_API_KEY)

    return provider

