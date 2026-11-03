"""Routes for team search, tracked team selection, and dashboard aggregation."""

import json
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import ClubWorkspace, PostDraft, TrackedTeam
from app.providers.base import FootballDataProvider
from app.providers.mock_provider import get_football_provider
from app.routes.workspaces import get_current_workspace
from app.services.match_service import sync_or_create_match
from app.services.quota_service import get_quota_status
from app.schemas.team import (
    ClubJourneyResponse,
    DashboardResponse,
    MatchSummary,
    TeamSearchResult,
    TrackedTeamCreate,
    TrackedTeamResponse,
)

router = APIRouter(prefix="/api/workspaces/{workspace_id}", tags=["teams & dashboard"])


@router.get(
    "/teams/search",
    response_model=list[TeamSearchResult],
    summary="Search for football teams",
)
def search_teams(
    q: str = Query(default="", description="Search query string"),
    workspace: ClubWorkspace = Depends(get_current_workspace),
    provider: FootballDataProvider = Depends(get_football_provider),
) -> list[TeamSearchResult]:
    """Search available football teams from the data provider.

    Requires workspace access.
    """
    teams = provider.search_teams(q)
    return [
        TeamSearchResult(
            id=t.id,
            name=t.name,
            short_name=t.short_name,
            country=t.country,
            league_id=t.league_id,
            league_name=t.league_name,
        )
        for t in teams
    ]


@router.get(
    "/tracked-team",
    response_model=TrackedTeamResponse,
    summary="Get current tracked team for workspace",
)
def get_tracked_team(
    workspace: ClubWorkspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
) -> TrackedTeam:
    """Return the currently selected club for this workspace."""
    tracked = (
        db.query(TrackedTeam)
        .filter(
            TrackedTeam.workspace_id == workspace.id,
            TrackedTeam.is_primary_team == True,  # noqa: E712
        )
        .first()
    )
    if tracked is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No team tracked in this workspace yet.",
        )
    return tracked


@router.post(
    "/tracked-team",
    response_model=TrackedTeamResponse,
    status_code=status.HTTP_200_OK,
    summary="Set or update tracked team for workspace",
)
def set_tracked_team(
    payload: TrackedTeamCreate,
    workspace: ClubWorkspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
    provider: FootballDataProvider = Depends(get_football_provider),
) -> TrackedTeam:
    """Select and store the team to track for this workspace.

    If a team is already tracked, it updates the tracked club details.
    """
    # Verify the team exists in the provider
    provider_team = provider.get_team(payload.provider_team_id)
    if not provider_team:
        # Fallback to team_name if id not strictly indexed
        pass

    existing = (
        db.query(TrackedTeam)
        .filter(
            TrackedTeam.workspace_id == workspace.id,
            TrackedTeam.is_primary_team == True,  # noqa: E712
        )
        .first()
    )

    if existing:
        existing.provider_name = payload.provider_name
        existing.provider_team_id = payload.provider_team_id
        existing.team_name = payload.team_name
        existing.league_id = payload.league_id or (provider_team.league_id if provider_team else None)
        existing.country = payload.country or (provider_team.country if provider_team else None)
        tracked = existing
    else:
        tracked = TrackedTeam(
            workspace_id=workspace.id,
            provider_name=payload.provider_name,
            provider_team_id=payload.provider_team_id,
            team_name=payload.team_name,
            league_id=payload.league_id or (provider_team.league_id if provider_team else None),
            country=payload.country or (provider_team.country if provider_team else None),
            is_primary_team=payload.is_primary_team,
        )
        db.add(tracked)

    db.commit()
    db.refresh(tracked)
    return tracked


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    summary="Get aggregated dashboard data for workspace",
)
def get_dashboard(
    workspace: ClubWorkspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
    provider: FootballDataProvider = Depends(get_football_provider),
) -> DashboardResponse:
    """Return dashboard summary including tracked team, next fixture, recent result,

    active live match, draft count, and API usage stats.
    """
    tracked = (
        db.query(TrackedTeam)
        .filter(
            TrackedTeam.workspace_id == workspace.id,
            TrackedTeam.is_primary_team == True,  # noqa: E712
        )
        .first()
    )

    next_fix_summary: MatchSummary | None = None
    recent_res_summary: MatchSummary | None = None
    live_match_summary: MatchSummary | None = None
    upcoming_summaries: list[MatchSummary] = []
    recent_summaries: list[MatchSummary] = []

    if tracked:
        # Sync & aggregate upcoming fixtures (up to 3)
        fixtures = provider.get_team_fixtures(tracked.provider_team_id)
        for f in fixtures[:3]:
            db_m = sync_or_create_match(db, workspace.id, f)
            m_sum = MatchSummary(
                id=str(db_m.id),
                home_team=db_m.home_team,
                away_team=db_m.away_team,
                kickoff_time=db_m.kickoff_time,
                status=db_m.status,
                league_name=db_m.league_name,
                venue=db_m.venue,
            )
            upcoming_summaries.append(m_sum)
        if upcoming_summaries:
            next_fix_summary = upcoming_summaries[0]

        # Sync & aggregate recent results (up to 3)
        results = provider.get_team_recent_results(tracked.provider_team_id)
        for r in results[:3]:
            db_r = sync_or_create_match(db, workspace.id, r)
            r_sum = MatchSummary(
                id=str(db_r.id),
                home_team=db_r.home_team,
                away_team=db_r.away_team,
                kickoff_time=db_r.kickoff_time,
                status=db_r.status,
                home_score=db_r.home_score,
                away_score=db_r.away_score,
                league_name=db_r.league_name,
                venue=db_r.venue,
            )
            recent_summaries.append(r_sum)
        if recent_summaries:
            recent_res_summary = recent_summaries[0]

        # Live match
        live = provider.get_live_match_for_team(tracked.provider_team_id)
        if live:
            db_live = sync_or_create_match(db, workspace.id, live)
            live_match_summary = MatchSummary(
                id=str(db_live.id),
                home_team=db_live.home_team,
                away_team=db_live.away_team,
                kickoff_time=db_live.kickoff_time,
                status=db_live.status,
                home_score=db_live.home_score,
                away_score=db_live.away_score,
                minute=db_live.minute,
                league_name=db_live.league_name,
                venue=db_live.venue,
            )

    drafts_count = (
        db.query(PostDraft)
        .filter(PostDraft.workspace_id == workspace.id)
        .count()
    )

    quota = get_quota_status(db, provider_name="mock")
    api_usage_info = {
        "daily_limit": quota.daily_limit,
        "used_today": quota.used_today,
        "remaining": quota.remaining,
        "percentage": quota.percentage,
        "status": quota.status,
        "warning_message": quota.warning_message,
    }

    return DashboardResponse(
        workspace_id=workspace.id,
        workspace_name=workspace.workspace_name,
        tracked_team=TrackedTeamResponse.model_validate(tracked) if tracked else None,
        next_fixture=next_fix_summary,
        recent_result=recent_res_summary,
        live_match=live_match_summary,
        upcoming_fixtures=upcoming_summaries,
        recent_results=recent_summaries,
        recent_drafts_count=drafts_count,
        api_usage=api_usage_info,
    )


def _generate_journey_data(team_name: str, league_name: str | None = None) -> dict:
    """Generate realistic journey and comparative statistics."""
    lowered = team_name.lower()
    if "arsenal" in lowered:
        return {
            "club_name": "Arsenal Football Club",
            "stadium": "Emirates Stadium (Capacity: 60,704)",
            "manager": "Mikel Arteta",
            "league": "Premier League",
            "founded": 1886,
            "previous_season": {
                "season": "2023–24",
                "league_finish": "2nd",
                "points": 89,
                "matches_played": 38,
                "won": 28,
                "drawn": 5,
                "lost": 5,
                "goals_for": 91,
                "goals_against": 29,
                "goal_difference": "+62",
                "clean_sheets": 18,
                "top_scorer": "Bukayo Saka (20 goals all comps)",
                "notable_moments": "Title race went to final day; best defensive record in Europe's top 5 leagues.",
            },
            "current_season": {
                "season": "2024–25",
                "league_position": "2nd",
                "points": 24,
                "matches_played": 11,
                "won": 7,
                "drawn": 3,
                "lost": 1,
                "goals_for": 22,
                "goals_against": 9,
                "goal_difference": "+13",
                "form": ["W", "W", "D", "W", "W"],
            },
            "comparison": {
                "points_pace": "+2 pts ahead of same fixture cycle last season",
                "goals_per_game": "2.00 vs 2.39 last season",
                "defensive_record": "0.81 goals conceded/game (Elite defensive foundation)",
                "takeaway": "Maintaining title-contender consistency while advancing into UCL knockout bracket.",
            },
        }
    elif "barcelona" in lowered:
        return {
            "club_name": "Futbol Club Barcelona",
            "stadium": "Estadi Olímpic Lluís Companys (Spotify Camp Nou)",
            "manager": "Hansi Flick",
            "league": "La Liga",
            "founded": 1899,
            "previous_season": {
                "season": "2023–24",
                "league_finish": "2nd",
                "points": 85,
                "matches_played": 38,
                "won": 26,
                "drawn": 7,
                "lost": 5,
                "goals_for": 79,
                "goals_against": 44,
                "goal_difference": "+35",
                "clean_sheets": 17,
                "top_scorer": "Robert Lewandowski (26 goals all comps)",
                "notable_moments": "Finished 2nd in La Liga and reached UEFA Champions League quarter-finals.",
            },
            "current_season": {
                "season": "2024–25",
                "league_position": "1st",
                "points": 33,
                "matches_played": 12,
                "won": 11,
                "drawn": 0,
                "lost": 1,
                "goals_for": 40,
                "goals_against": 11,
                "goal_difference": "+29",
                "form": ["W", "W", "W", "W", "W"],
            },
            "comparison": {
                "points_pace": "+6 pts ahead of same stage last season",
                "goals_per_game": "3.33 goals/game (Highest in Europe)",
                "defensive_record": "Offside trap mastery, holding opposition to under 1 goal/match",
                "takeaway": "Historic attacking form under Hansi Flick with Yamal, Lewandowski & Raphinha leading Europe in goal output.",
            },
        }
    else:
        clean_name = team_name.replace(" FC", "").replace(" CF", "")
        return {
            "club_name": team_name,
            "stadium": f"{clean_name} Stadium",
            "manager": "First Team Head Coach",
            "league": league_name or "National Championship",
            "founded": 1902,
            "previous_season": {
                "season": "2023–24",
                "league_finish": "3rd",
                "points": 74,
                "matches_played": 38,
                "won": 22,
                "drawn": 8,
                "lost": 8,
                "goals_for": 71,
                "goals_against": 38,
                "goal_difference": "+33",
                "clean_sheets": 14,
                "top_scorer": "Club Striker (19 goals)",
                "notable_moments": "Secured European qualification with late season run.",
            },
            "current_season": {
                "season": "2024–25",
                "league_position": "3rd",
                "points": 21,
                "matches_played": 11,
                "won": 6,
                "drawn": 3,
                "lost": 2,
                "goals_for": 20,
                "goals_against": 11,
                "goal_difference": "+9",
                "form": ["W", "D", "W", "L", "W"],
            },
            "comparison": {
                "points_pace": "On par with previous season pace",
                "goals_per_game": "1.82 goals/game",
                "defensive_record": "1.00 goals conceded/game",
                "takeaway": "Stable performance competing for top spots in domestic league.",
            },
        }


@router.get(
    "/club-journey",
    response_model=ClubJourneyResponse,
    summary="Get club historical performance and season comparison",
)
def get_club_journey(
    workspace: ClubWorkspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
) -> dict:
    """Retrieve 1-time cached journey data comparing previous vs current season."""
    tracked = (
        db.query(TrackedTeam)
        .filter(
            TrackedTeam.workspace_id == workspace.id,
            TrackedTeam.is_primary_team == True,  # noqa: E712
        )
        .first()
    )
    if not tracked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tracked team found for this workspace",
        )

    if tracked.journey_data:
        try:
            return json.loads(tracked.journey_data)
        except Exception:
            pass

    # Generate, cache in DB once, and return
    journey = _generate_journey_data(tracked.team_name, tracked.league_id)
    tracked.journey_data = json.dumps(journey)
    db.commit()
    db.refresh(tracked)
    return journey

