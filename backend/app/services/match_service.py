"""Match monitoring, snapshot ingestion, event diffing, and cooldown enforcement."""

import json
from datetime import datetime, timedelta, timezone
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import ClubWorkspace, Match, MatchEvent, MatchSnapshot, PostDraft
from app.providers.base import FootballDataProvider, ProviderMatch, ProviderMatchEvent
from app.services.draft_service import (
    create_draft_if_not_exists,
    generate_fulltime_draft,
    generate_goal_draft,
    generate_halftime_draft,
    generate_red_card_draft,
    generate_substitution_draft,
)
from app.services.quota_service import enforce_quota_or_raise, record_api_call

# In-memory store for manual fetch cooldown per workspace
# Map: workspace_id -> last_fetch_datetime (UTC)
_LAST_MANUAL_FETCH: dict[int, datetime] = {}


def check_manual_fetch_cooldown(workspace_id: int) -> int:
    """Check if the workspace is within the 45-second manual fetch cooldown.

    Returns:
        Remaining cooldown seconds (0 if cooldown has passed).
    """
    last_fetch = _LAST_MANUAL_FETCH.get(workspace_id)
    if not last_fetch:
        return 0

    elapsed = (datetime.now(timezone.utc) - last_fetch).total_seconds()
    cooldown = settings.MANUAL_FETCH_COOLDOWN_SECONDS
    if elapsed < cooldown:
        return int(cooldown - elapsed)
    return 0


def record_manual_fetch_timestamp(workspace_id: int) -> None:
    """Record current UTC timestamp for manual fetch cooldown."""
    _LAST_MANUAL_FETCH[workspace_id] = datetime.now(timezone.utc)


def sync_or_create_match(
    db: Session,
    workspace_id: int,
    provider_match: ProviderMatch,
) -> Match:
    """Find existing Match in DB or create a new one."""
    match = (
        db.query(Match)
        .filter(
            Match.workspace_id == workspace_id,
            Match.provider_match_id == provider_match.id,
        )
        .first()
    )

    if not match:
        match = Match(
            workspace_id=workspace_id,
            provider_match_id=provider_match.id,
            home_team=provider_match.home_team_name,
            away_team=provider_match.away_team_name,
            kickoff_time=provider_match.kickoff_time,
            status=provider_match.status,
            home_score=provider_match.home_score,
            away_score=provider_match.away_score,
            minute=provider_match.minute,
            league_name=provider_match.league_name,
            venue=provider_match.venue,
        )
        db.add(match)
        db.commit()
        db.refresh(match)

        # If provider match is finished and came with pre-existing events, sync events too
        if provider_match.status == "finished" and provider_match.events:
            for pe in provider_match.events:
                db_event = MatchEvent(
                    match_id=match.id,
                    event_type=pe.event_type,
                    minute=pe.minute,
                    player_name=pe.player_name,
                    team_name=pe.team_name,
                    event_detail=pe.event_detail,
                )
                db.add(db_event)
            db.commit()
            db.refresh(match)
    else:
        # Update match status and scores
        match.status = provider_match.status
        match.home_score = provider_match.home_score
        match.away_score = provider_match.away_score
        match.minute = provider_match.minute
        if provider_match.league_name:
            match.league_name = provider_match.league_name
        if provider_match.venue:
            match.venue = provider_match.venue
        db.commit()
        db.refresh(match)

    return match


def process_match_snapshot_and_diff(
    db: Session,
    workspace_id: int,
    match: Match,
    provider_match: ProviderMatch,
) -> list[PostDraft]:
    """Save match snapshot, detect newly occurred events, save them,

    and generate post drafts.
    """
    new_drafts: list[PostDraft] = []

    # 1. Save new snapshot
    raw_json = json.dumps(provider_match.raw_data or {})
    snapshot = MatchSnapshot(
        match_id=match.id,
        fetched_at=datetime.now(timezone.utc),
        raw_data=raw_json,
        minute=provider_match.minute,
        home_score=provider_match.home_score,
        away_score=provider_match.away_score,
    )
    db.add(snapshot)
    db.commit()

    # 2. Retrieve existing stored events to diff against
    existing_events = db.query(MatchEvent).filter(MatchEvent.match_id == match.id).all()
    # Create deterministic event signatures to prevent duplicate ingestion:
    # (event_type, minute, player_name, team_name)
    existing_sigs = {
        (
            e.event_type.lower(),
            e.minute,
            (e.player_name or "").lower(),
            (e.team_name or "").lower(),
        )
        for e in existing_events
    }

    # 3. Process new events from provider
    new_events_detected: list[MatchEvent] = []
    for pe in provider_match.events:
        sig = (
            pe.event_type.lower(),
            pe.minute,
            (pe.player_name or "").lower(),
            (pe.team_name or "").lower(),
        )
        if sig not in existing_sigs:
            new_event = MatchEvent(
                match_id=match.id,
                event_type=pe.event_type,
                minute=pe.minute,
                player_name=pe.player_name,
                team_name=pe.team_name,
                event_detail=pe.event_detail,
            )
            db.add(new_event)
            db.commit()
            db.refresh(new_event)
            existing_sigs.add(sig)
            new_events_detected.append(new_event)

            # Generate event-specific draft
            h_score = provider_match.home_score if provider_match.home_score is not None else 0
            a_score = provider_match.away_score if provider_match.away_score is not None else 0

            if pe.event_type == "goal":
                content = generate_goal_draft(
                    home_team=match.home_team,
                    away_team=match.away_team,
                    home_score=h_score,
                    away_score=a_score,
                    player_name=pe.player_name or "Player",
                    team_name=pe.team_name or match.home_team,
                    minute=pe.minute,
                )
                draft = create_draft_if_not_exists(
                    db,
                    workspace_id=workspace_id,
                    match_id=match.id,
                    post_type="goal",
                    content=content,
                )
                if draft:
                    new_drafts.append(draft)

            elif pe.event_type == "red_card":
                content = generate_red_card_draft(
                    player_name=pe.player_name or "",
                    team_name=pe.team_name or match.away_team,
                    minute=pe.minute,
                )
                draft = create_draft_if_not_exists(
                    db,
                    workspace_id=workspace_id,
                    match_id=match.id,
                    post_type="red_card",
                    content=content,
                )
                if draft:
                    new_drafts.append(draft)

            elif pe.event_type in ("substitution", "sub"):
                content = generate_substitution_draft(
                    player_name=pe.player_name or "Substitute",
                    team_name=pe.team_name or match.home_team,
                    minute=pe.minute or 0,
                    event_detail=pe.event_detail,
                )
                draft = create_draft_if_not_exists(
                    db,
                    workspace_id=workspace_id,
                    match_id=match.id,
                    post_type="substitution",
                    content=content,
                )
                if draft:
                    new_drafts.append(draft)

    # 4. Check Half-Time trigger
    all_events_now = db.query(MatchEvent).filter(MatchEvent.match_id == match.id).all()
    h_score = provider_match.home_score if provider_match.home_score is not None else 0
    a_score = provider_match.away_score if provider_match.away_score is not None else 0

    if provider_match.status == "halftime" or (provider_match.minute and provider_match.minute >= 45 and provider_match.status == "live" and provider_match.minute <= 48):
        content = generate_halftime_draft(
            home_team=match.home_team,
            away_team=match.away_team,
            home_score=h_score,
            away_score=a_score,
            events=all_events_now,
        )
        ht_draft = create_draft_if_not_exists(
            db,
            workspace_id=workspace_id,
            match_id=match.id,
            post_type="halftime",
            content=content,
        )
        if ht_draft:
            new_drafts.append(ht_draft)

    # 5. Check Full-Time trigger
    if provider_match.status == "finished":
        content = generate_fulltime_draft(
            home_team=match.home_team,
            away_team=match.away_team,
            home_score=h_score,
            away_score=a_score,
            events=all_events_now,
        )
        ft_draft = create_draft_if_not_exists(
            db,
            workspace_id=workspace_id,
            match_id=match.id,
            post_type="fulltime",
            content=content,
        )
        if ft_draft:
            new_drafts.append(ft_draft)

    return new_drafts


def monitor_live_match_for_workspace(
    db: Session,
    workspace: ClubWorkspace,
    provider: FootballDataProvider,
    is_manual: bool = False,
) -> tuple[Match | None, list[PostDraft]]:
    """Fetch live match for tracked club, check quotas, enforce cooldown, and process diffs."""
    # Enforce manual fetch cooldown if manual request
    if is_manual:
        remaining_cd = check_manual_fetch_cooldown(workspace.id)
        if remaining_cd > 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining_cd} seconds before fetching again.",
                headers={"Retry-After": str(remaining_cd)},
            )
        record_manual_fetch_timestamp(workspace.id)

    # Enforce API quota
    enforce_quota_or_raise(db, provider_name=provider.provider_name, workspace_id=workspace.id)

    # Find primary tracked team
    tracked_team = [t for t in workspace.tracked_teams if t.is_primary_team]
    if not tracked_team:
        return None, []

    team_id = tracked_team[0].provider_team_id

    # Call provider API
    record_api_call(
        db,
        provider_name=provider.provider_name,
        endpoint=f"/teams/{team_id}/live-match",
        status_str="success",
        workspace_id=workspace.id,
    )
    provider_match = provider.get_live_match_for_team(team_id)

    if not provider_match:
        return None, []

    match_record = sync_or_create_match(db, workspace.id, provider_match)
    new_drafts = process_match_snapshot_and_diff(db, workspace.id, match_record, provider_match)

    return match_record, new_drafts

