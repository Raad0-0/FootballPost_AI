"""SQLAlchemy ORM models for the ClubPost application."""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


class User(Base):
    """Application user who owns one or more club workspaces."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # relationships
    workspaces = relationship("ClubWorkspace", back_populates="owner")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"


# ---------------------------------------------------------------------------
# Club Workspaces
# ---------------------------------------------------------------------------


class ClubWorkspace(Base):
    """A workspace representing a single club/team context."""

    __tablename__ = "club_workspaces"

    id = Column(Integer, primary_key=True, autoincrement=True)
    owner_user_id = Column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    workspace_name = Column(String(255), nullable=False)
    default_hashtags = Column(String(255), nullable=True, default="")
    default_language = Column(String(50), nullable=False, default="english")
    default_tone = Column(String(50), nullable=False, default="hype")
    gemini_api_key = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # relationships
    owner = relationship("User", back_populates="workspaces")
    tracked_teams = relationship("TrackedTeam", back_populates="workspace")
    matches = relationship("Match", back_populates="workspace")
    post_drafts = relationship("PostDraft", back_populates="workspace")
    news_articles = relationship("ClubNews", back_populates="workspace")

    def __repr__(self) -> str:
        return f"<ClubWorkspace id={self.id} name={self.workspace_name!r}>"


# ---------------------------------------------------------------------------
# Tracked Teams
# ---------------------------------------------------------------------------


class TrackedTeam(Base):
    """A team tracked within a workspace, linked to an external data provider."""

    __tablename__ = "tracked_teams"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(
        Integer, ForeignKey("club_workspaces.id"), nullable=False, index=True
    )
    provider_name = Column(String(100), nullable=False)
    provider_team_id = Column(String(100), nullable=False)
    team_name = Column(String(255), nullable=False)
    league_id = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    is_primary_team = Column(Boolean, default=True)
    journey_data = Column(Text, nullable=True)

    # relationships
    workspace = relationship("ClubWorkspace", back_populates="tracked_teams")

    def __repr__(self) -> str:
        return (
            f"<TrackedTeam id={self.id} team={self.team_name!r} "
            f"provider={self.provider_name!r}>"
        )


# ---------------------------------------------------------------------------
# Matches
# ---------------------------------------------------------------------------


class Match(Base):
    """A football match associated with a workspace."""

    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(
        Integer, ForeignKey("club_workspaces.id"), nullable=False, index=True
    )
    provider_match_id = Column(String(100), nullable=False)
    home_team = Column(String(255), nullable=False)
    away_team = Column(String(255), nullable=False)
    kickoff_time = Column(DateTime, nullable=True)
    status = Column(String(50), default="scheduled")
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    minute = Column(Integer, nullable=True)
    league_name = Column(String(100), nullable=True)
    venue = Column(String(255), nullable=True)

    # relationships
    workspace = relationship("ClubWorkspace", back_populates="matches")
    snapshots = relationship("MatchSnapshot", back_populates="match")
    events = relationship("MatchEvent", back_populates="match", order_by="MatchEvent.minute")
    post_drafts = relationship("PostDraft", back_populates="match")

    def __repr__(self) -> str:
        return (
            f"<Match id={self.id} {self.home_team} vs {self.away_team} "
            f"status={self.status!r}>"
        )


# ---------------------------------------------------------------------------
# Match Snapshots
# ---------------------------------------------------------------------------


class MatchSnapshot(Base):
    """A point-in-time snapshot of raw match data from the API provider."""

    __tablename__ = "match_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(
        Integer, ForeignKey("matches.id"), nullable=False, index=True
    )
    fetched_at = Column(DateTime, default=datetime.utcnow)
    raw_data = Column(Text, nullable=True)
    minute = Column(Integer, nullable=True)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)

    # relationships
    match = relationship("Match", back_populates="snapshots")

    def __repr__(self) -> str:
        return (
            f"<MatchSnapshot id={self.id} match_id={self.match_id} "
            f"minute={self.minute}>"
        )


# ---------------------------------------------------------------------------
# Match Events
# ---------------------------------------------------------------------------


class MatchEvent(Base):
    """A discrete event that occurred during a match (goal, card, etc.)."""

    __tablename__ = "match_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(
        Integer, ForeignKey("matches.id"), nullable=False, index=True
    )
    event_type = Column(String(50), nullable=False)
    minute = Column(Integer, nullable=True)
    player_name = Column(String(255), nullable=True)
    team_name = Column(String(255), nullable=True)
    event_detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # relationships
    match = relationship("Match", back_populates="events")

    def __repr__(self) -> str:
        return (
            f"<MatchEvent id={self.id} type={self.event_type!r} "
            f"minute={self.minute} player={self.player_name!r}>"
        )


# ---------------------------------------------------------------------------
# Post Drafts
# ---------------------------------------------------------------------------


class PostDraft(Base):
    """A social-media post draft generated from match data."""

    __tablename__ = "post_drafts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(
        Integer, ForeignKey("club_workspaces.id"), nullable=False, index=True
    )
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=True)
    post_type = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String(50), default="new")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # relationships
    workspace = relationship("ClubWorkspace", back_populates="post_drafts")
    match = relationship("Match", back_populates="post_drafts")

    def __repr__(self) -> str:
        return (
            f"<PostDraft id={self.id} type={self.post_type!r} "
            f"status={self.status!r}>"
        )


# ---------------------------------------------------------------------------
# API Usage Logs
# ---------------------------------------------------------------------------


class ApiUsageLog(Base):
    """Log entry for every external API call made by the application."""

    __tablename__ = "api_usage_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(
        Integer, ForeignKey("club_workspaces.id"), nullable=True
    )
    provider_name = Column(String(100), nullable=False)
    endpoint = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return (
            f"<ApiUsageLog id={self.id} provider={self.provider_name!r} "
            f"status={self.status!r}>"
        )


# ---------------------------------------------------------------------------
# API Quota Settings
# ---------------------------------------------------------------------------


class ApiQuotaSetting(Base):
    """Per-provider daily API quota configuration."""

    __tablename__ = "api_quota_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    provider_name = Column(String(100), unique=True, nullable=False)
    daily_limit = Column(Integer, nullable=False, default=100)
    reset_time_utc = Column(String(10), default="00:00")

    def __repr__(self) -> str:
        return (
            f"<ApiQuotaSetting id={self.id} provider={self.provider_name!r} "
            f"limit={self.daily_limit}>"
        )


# ---------------------------------------------------------------------------
# Club News & Transfer Rumors
# ---------------------------------------------------------------------------


class ClubNews(Base):
    """Cached news or transfer rumor item from RSS feeds."""

    __tablename__ = "club_news"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(
        Integer, ForeignKey("club_workspaces.id"), nullable=False, index=True
    )
    headline = Column(String(500), nullable=False)
    summary = Column(Text, nullable=True)
    source_url = Column(String(1000), nullable=False)
    source_name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False, default="news")  # "news", "transfer"
    credibility_tier = Column(String(50), default="tier2")  # "tier1", "tier2", "rumor"
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # relationships
    workspace = relationship("ClubWorkspace", back_populates="news_articles")

    def __repr__(self) -> str:
        return f"<ClubNews id={self.id} headline={self.headline[:30]!r}>"
