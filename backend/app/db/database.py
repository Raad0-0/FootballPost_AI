"""SQLAlchemy engine, session, and Base setup for SQLite."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.core.config import settings

# ---------------------------------------------------------------------------
# Engine & session factory
# ---------------------------------------------------------------------------

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},  # required for SQLite
    pool_pre_ping=True,
)

SessionLocal: sessionmaker[Session] = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()

# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------


def get_db() -> Generator[Session, None, None]:
    """Yield a database session and ensure it is closed after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Initialization helper
# ---------------------------------------------------------------------------


def init_db() -> None:
    """Create all tables that don't already exist.

    Models are imported here so that ``Base.metadata`` knows about every
    table before ``create_all`` is called.
    """
    import app.db.models  # noqa: F401 — register all models with Base.metadata

    Base.metadata.create_all(bind=engine)
