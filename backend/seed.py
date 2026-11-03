"""Database seeding script for ClubPost MVP.

Creates a ready-to-test user account, two distinct club workspaces,
tracked teams, matches, events, and sample post drafts.

Usage:
    cd backend
    python seed.py
"""

from datetime import datetime, timedelta, timezone

from app.core.security import hash_password
from app.db.database import Base, SessionLocal, engine, init_db
from app.db.models import (
    ApiQuotaSetting,
    ClubWorkspace,
    Match,
    MatchEvent,
    MatchSnapshot,
    PostDraft,
    TrackedTeam,
    User,
)


def seed_database() -> None:
    """Populate database with initial test data."""
    print("Initializing database tables...")
    init_db()

    db = SessionLocal()
    try:
        # 1. Clear existing seed data or create fresh
        user_email = "admin@clubpost.dev"
        user_pass = "password123"

        existing_user = db.query(User).filter(User.email == user_email).first()
        if existing_user:
            print(f"User '{user_email}' already exists. Removing old data for clean seed...")
            # Clean up user's workspaces
            workspaces = db.query(ClubWorkspace).filter(ClubWorkspace.owner_user_id == existing_user.id).all()
            for ws in workspaces:
                db.delete(ws)
            db.delete(existing_user)
            db.commit()

        # 2. Create Primary Admin User
        user = User(
            email=user_email,
            hashed_password=hash_password(user_pass),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[OK] Created user: {user.email} (Password: {user_pass})")

        # 3. Create Provider Quota Setting
        quota = db.query(ApiQuotaSetting).filter(ApiQuotaSetting.provider_name == "mock").first()
        if not quota:
            quota = ApiQuotaSetting(provider_name="mock", daily_limit=100)
            db.add(quota)
            db.commit()
            print("[OK] Configured mock provider daily quota limit: 100 calls/day")

        now = datetime.now(timezone.utc)

        # 4. Workspace 1: Arsenal Fan Page
        ws_arsenal = ClubWorkspace(
            owner_user_id=user.id,
            workspace_name="Arsenal Fan Page",
            default_hashtags="#COYG #Arsenal #PremierLeague",
            default_language="english",
            default_tone="hype",
        )
        db.add(ws_arsenal)
        db.commit()
        db.refresh(ws_arsenal)

        # Tracked Team 1
        team_arsenal = TrackedTeam(
            workspace_id=ws_arsenal.id,
            provider_name="mock",
            provider_team_id="mock-arsenal",
            team_name="Arsenal FC",
            league_id="PL",
            country="England",
            is_primary_team=True,
        )
        db.add(team_arsenal)

        # Match 1: Upcoming Fixture
        match_fix_ars = Match(
            workspace_id=ws_arsenal.id,
            provider_match_id="mock-match-fix-1",
            home_team="Arsenal FC",
            away_team="Manchester City",
            kickoff_time=now + timedelta(days=3, hours=4),
            status="scheduled",
            league_name="Premier League",
            venue="Emirates Stadium",
        )
        db.add(match_fix_ars)

        # Match 2: Recent Result
        match_res_ars = Match(
            workspace_id=ws_arsenal.id,
            provider_match_id="mock-match-res-1",
            home_team="Arsenal FC",
            away_team="Liverpool FC",
            kickoff_time=now - timedelta(days=5),
            status="finished",
            home_score=2,
            away_score=1,
            league_name="Premier League",
            venue="Emirates Stadium",
        )
        db.add(match_res_ars)

        # Match 3: Active Live Match
        match_live_ars = Match(
            workspace_id=ws_arsenal.id,
            provider_match_id="mock-match-live-1",
            home_team="Arsenal FC",
            away_team="Chelsea FC",
            kickoff_time=now - timedelta(minutes=38),
            status="live",
            home_score=1,
            away_score=0,
            minute=38,
            league_name="Premier League",
            venue="Emirates Stadium",
        )
        db.add(match_live_ars)
        db.commit()
        db.refresh(match_live_ars)

        # Live Events for Arsenal
        evt_goal_ars = MatchEvent(
            match_id=match_live_ars.id,
            event_type="goal",
            minute=23,
            player_name="Bukayo Saka",
            team_name="Arsenal FC",
            event_detail="Left-footed curling effort into top-left corner.",
        )
        evt_card_ars = MatchEvent(
            match_id=match_live_ars.id,
            event_type="yellow_card",
            minute=31,
            player_name="Moises Caicedo",
            team_name="Chelsea FC",
            event_detail="Tactical foul.",
        )
        db.add_all([evt_goal_ars, evt_card_ars])

        # Sample Drafts for Arsenal
        draft_goal = PostDraft(
            workspace_id=ws_arsenal.id,
            match_id=match_live_ars.id,
            post_type="goal",
            content="⚽ GOAL!\n\nBukayo Saka puts Arsenal FC ahead in the 23rd minute.\n\nArsenal FC 1-0 Chelsea FC.",
            status="new",
        )
        draft_fixture = PostDraft(
            workspace_id=ws_arsenal.id,
            match_id=match_fix_ars.id,
            post_type="fixture",
            content="⚽ Matchday Preview!\n\nArsenal FC face Manchester City in the Premier League.\n\nKickoff: Saturday 8:00 PM\nVenue: Emirates Stadium",
            status="edited",
        )
        db.add_all([draft_goal, draft_fixture])
        db.commit()
        print(f"[OK] Created Workspace 1: '{ws_arsenal.workspace_name}' tracking Arsenal FC (with 3 matches & 2 drafts)")

        # 5. Workspace 2: FC Barcelona Hub
        ws_barca = ClubWorkspace(
            owner_user_id=user.id,
            workspace_name="FC Barcelona Hub",
            default_hashtags="#ViscaBarca #FCBarcelona #LaLiga",
            default_language="english",
            default_tone="hype",
        )
        db.add(ws_barca)
        db.commit()
        db.refresh(ws_barca)

        # Tracked Team 2
        team_barca = TrackedTeam(
            workspace_id=ws_barca.id,
            provider_name="mock",
            provider_team_id="mock-barcelona",
            team_name="FC Barcelona",
            league_id="PD",
            country="Spain",
            is_primary_team=True,
        )
        db.add(team_barca)

        # Match: Recent Result
        match_res_barca = Match(
            workspace_id=ws_barca.id,
            provider_match_id="mock-match-res-2",
            home_team="FC Barcelona",
            away_team="Bayern Munich",
            kickoff_time=now - timedelta(days=4),
            status="finished",
            home_score=4,
            away_score=1,
            league_name="Champions League",
            venue="Montjuïc Stadium",
        )
        db.add(match_res_barca)
        db.commit()
        db.refresh(match_res_barca)

        # Sample Draft for Barcelona
        draft_barca_res = PostDraft(
            workspace_id=ws_barca.id,
            match_id=match_res_barca.id,
            post_type="fulltime",
            content="Full-Time: FC Barcelona 4-1 Bayern Munich\n\nFC Barcelona take all three points after a dominant performance!\n\nGoals:\n- Raphinha 1'\n- Robert Lewandowski 36'\n- Raphinha 45'\n- Raphinha 56'",
            status="copied",
        )
        db.add(draft_barca_res)
        db.commit()
        print(f"[OK] Created Workspace 2: '{ws_barca.workspace_name}' tracking FC Barcelona (with 1 match & 1 draft)")

        print("\n" + "=" * 60)
        print("SEEDING COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print(f"Login Email:    {user_email}")
        print(f"Login Password: {user_pass}")
        print(f"Workspace 1:    ID {ws_arsenal.id} -> Arsenal Fan Page")
        print(f"Workspace 2:    ID {ws_barca.id} -> FC Barcelona Hub")
        print("\nStart the web application:")
        print("  Backend:  cd backend; python -m uvicorn app.main:app --reload")
        print("  Frontend: cd frontend; npm run dev")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
