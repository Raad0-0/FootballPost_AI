"""Template-based post draft generator.

Generates strictly factual social media post drafts based only on verified match data.
Enforces deduplication to prevent repeated drafts for the same match events.
"""

from sqlalchemy.orm import Session

from app.db.models import Match, MatchEvent, PostDraft
from app.providers.base import ProviderMatch, ProviderMatchEvent


def generate_goal_draft(
    home_team: str,
    away_team: str,
    home_score: int,
    away_score: int,
    player_name: str,
    team_name: str,
    minute: int,
) -> str:
    """Generate a factual goal announcement draft."""
    score_line = f"{home_team} {home_score}-{away_score} {away_team}"

    # Determine context: lead or level
    if home_score == away_score:
        action = f"{player_name} levels the score for {team_name} in the {minute}th minute."
    else:
        leading_team = home_team if home_score > away_score else away_team
        if team_name.lower() in leading_team.lower() or leading_team.lower() in team_name.lower():
            action = f"{player_name} puts {team_name} ahead in the {minute}th minute."
        else:
            action = f"{player_name} scores for {team_name} in the {minute}th minute."

    return (
        f"⚽ GOAL!\n\n"
        f"{action}\n\n"
        f"{score_line}."
    )


def generate_red_card_draft(
    player_name: str,
    team_name: str,
    minute: int,
) -> str:
    """Generate a factual red card dismissal draft."""
    player_part = f" ({player_name})" if player_name else ""
    return (
        f"🟥 Red Card!\n\n"
        f"{team_name} are down to 10 men after a dismissal in the {minute}th minute{player_part}.\n\n"
        f"Big moment in the match."
    )


def generate_substitution_draft(
    player_name: str,
    team_name: str,
    minute: int,
    event_detail: str | None = None,
) -> str:
    """Generate a factual substitution draft."""
    detail_line = f"\n{event_detail}" if event_detail else ""
    return (
        f"🔄 Substitution ({minute}’)\n\n"
        f"{team_name}: {player_name}{detail_line}\n\n"
        f"Tactical change on the pitch."
    )


def generate_halftime_draft(
    home_team: str,
    away_team: str,
    home_score: int,
    away_score: int,
    events: list[MatchEvent] | None = None,
) -> str:
    """Generate a half-time summary draft based only on factual score and events."""
    score_line = f"Half-Time: {home_team} {home_score}-{away_score} {away_team}"

    if home_score > away_score:
        summary = f"{home_team} lead at the break."
    elif away_score > home_score:
        summary = f"{away_team} lead at the break."
    else:
        summary = "All square at the interval after an intense first half."

    # Highlight any first-half goals
    goal_lines: list[str] = []
    if events:
        for ev in events:
            if ev.event_type == "goal" and (ev.minute or 0) <= 45:
                goal_lines.append(f"- {ev.player_name or 'Goal'} {ev.minute}’ ({ev.team_name or ''})")

    details = "\n".join(goal_lines) if goal_lines else ""
    if details:
        body = f"{summary}\n\nGoals so far:\n{details}"
    else:
        body = summary

    return f"{score_line}\n\n{body}\n\nSecond half coming up."


def generate_fulltime_draft(
    home_team: str,
    away_team: str,
    home_score: int,
    away_score: int,
    events: list[MatchEvent] | None = None,
) -> str:
    """Generate a full-time summary draft with scoreline and all goalscorers."""
    score_line = f"Full-Time: {home_team} {home_score}-{away_score} {away_team}"

    if home_score > away_score:
        summary = f"{home_team} take all three points after a strong performance."
    elif away_score > home_score:
        summary = f"{away_team} claim victory on the road."
    else:
        summary = "Points shared after a hard-fought draw."

    goals = []
    if events:
        for ev in events:
            if ev.event_type == "goal":
                goals.append(f"- {ev.player_name or 'Goal'} {ev.minute}’ for {ev.team_name or 'team'}")

    goals_section = "\n".join(goals) if goals else "No goals recorded."

    return (
        f"{score_line}\n\n"
        f"{summary}\n\n"
        f"Goals:\n"
        f"{goals_section}"
    )


def generate_fixture_draft(
    home_team: str,
    away_team: str,
    kickoff_str: str,
    league_name: str | None = None,
    venue: str | None = None,
) -> str:
    """Generate an upcoming match fixture preview draft."""
    comp = f" in the {league_name}" if league_name else ""
    venue_line = f"\nVenue: {venue}" if venue else ""
    return (
        f"⚽ Matchday!\n\n"
        f"{home_team} face {away_team}{comp}.\n\n"
        f"Kickoff: {kickoff_str}{venue_line}"
    )


def create_draft_if_not_exists(
    db: Session,
    workspace_id: int,
    match_id: int | None,
    post_type: str,
    content: str,
    dedup_key: str | None = None,
) -> PostDraft | None:
    """Check if a draft with identical content or type already exists for this match in this workspace.

    If not, create and return it.
    """
    query = db.query(PostDraft).filter(
        PostDraft.workspace_id == workspace_id,
        PostDraft.post_type == post_type,
    )
    if match_id is not None:
        query = query.filter(PostDraft.match_id == match_id)

    # For HT and FT, only allow 1 per match
    if post_type in ("halftime", "fulltime") and match_id is not None:
        existing = query.first()
        if existing:
            return None

    # For goal/card, check exact content or minute matching
    existing_all = query.all()
    for d in existing_all:
        if d.content.strip() == content.strip():
            return None

    new_draft = PostDraft(
        workspace_id=workspace_id,
        match_id=match_id,
        post_type=post_type,
        content=content.strip(),
        status="new",
    )
    db.add(new_draft)
    db.commit()
    db.refresh(new_draft)
    return new_draft

