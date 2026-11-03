"""Automated tests for API Quota Management & Warning Thresholds."""

from app.db.models import ApiQuotaSetting
from app.services.quota_service import (
    enforce_quota_or_raise,
    get_quota_status,
    record_api_call,
)
from tests.test_workspaces import get_token


def test_quota_tracking_and_threshold_levels(db_session):
    # Set limit to 10 for testing
    setting = ApiQuotaSetting(provider_name="test-prov", daily_limit=10)
    db_session.add(setting)
    db_session.commit()

    # 1. 0 calls -> 0%, OK
    q0 = get_quota_status(db_session, "test-prov")
    assert q0.status == "ok"
    assert q0.percentage == 0.0
    assert q0.remaining == 10

    # 2. Record 7 calls -> 70%, Warning
    for _ in range(7):
        record_api_call(db_session, "test-prov", "/test-endpoint", "success")

    q7 = get_quota_status(db_session, "test-prov")
    assert q7.status == "warning"
    assert q7.percentage == 70.0
    assert q7.remaining == 3
    assert "warning" in q7.warning_message.lower()

    # 3. Record 2 more calls -> 9 calls = 90%, Critical
    for _ in range(2):
        record_api_call(db_session, "test-prov", "/test-endpoint", "success")

    q9 = get_quota_status(db_session, "test-prov")
    assert q9.status == "critical"
    assert q9.percentage == 90.0
    assert q9.remaining == 1
    assert "critical" in q9.warning_message.lower()

    # 4. Record 1 more call -> 10 calls = 100%, Blocked
    record_api_call(db_session, "test-prov", "/test-endpoint", "success")
    q10 = get_quota_status(db_session, "test-prov")
    assert q10.status == "blocked"
    assert q10.percentage == 100.0
    assert q10.remaining == 0
    assert "limit reached" in q10.warning_message.lower()


def test_quota_blocking_raises_http_429(db_session):
    # Set limit to 2
    setting = ApiQuotaSetting(provider_name="exhausted-prov", daily_limit=2)
    db_session.add(setting)
    db_session.commit()

    # Exhaust quota
    record_api_call(db_session, "exhausted-prov", "/ep", "success")
    record_api_call(db_session, "exhausted-prov", "/ep", "success")

    # Next call must raise 429
    import pytest
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        enforce_quota_or_raise(db_session, "exhausted-prov")

    assert exc_info.value.status_code == 429
    assert "limit reached" in exc_info.value.detail.lower()


def test_usage_endpoint(client):
    token = get_token(client, "quota_viewer@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/usage", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "daily_limit" in data
    assert "used_today" in data
    assert "remaining" in data
    assert "status" in data

