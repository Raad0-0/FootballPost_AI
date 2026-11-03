"""Pytest fixtures for ClubPost backend testing."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.models  # Ensure all models are registered
from app.db.database import Base, get_db
from app.main import app
from app.providers.mock_provider import get_football_provider
from app.services.match_service import _LAST_MANUAL_FETCH

# Test database in-memory SQLite shared across connections for the test session
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def disable_scheduler_for_tests():
    """Disable background scheduler during tests to avoid thread pool and db lock contention."""
    from app.services import scheduler
    orig_start = scheduler.start_scheduler
    orig_stop = scheduler.stop_scheduler
    scheduler.start_scheduler = lambda: None
    scheduler.stop_scheduler = lambda: None
    yield
    scheduler.start_scheduler = orig_start
    scheduler.stop_scheduler = orig_stop


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables before tests run, drop them after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session():
    """Provide a fresh database transaction per test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session):
    """FastAPI test client with database dependency override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def clean_mock_and_cooldown():
    """Reset mock provider state and cooldown memory before and after every test."""
    provider = get_football_provider()
    if hasattr(provider, "reset"):
        provider.reset()
    _LAST_MANUAL_FETCH.clear()
    yield
    if hasattr(provider, "reset"):
        provider.reset()
    _LAST_MANUAL_FETCH.clear()

