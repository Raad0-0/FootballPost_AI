"""API Quota Management Service.

Tracks API consumption in `api_usage_logs` and enforces daily limits:
- < 70%: OK
- 70% - 89%: Warning
- 90% - 99%: Critical Warning
- 100%: Blocked (throws HTTP 429)
"""

from dataclasses import dataclass
from datetime import datetime, time, timezone
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import ApiQuotaSetting, ApiUsageLog


@dataclass
class QuotaStatus:
    """Represents current provider quota health."""

    daily_limit: int
    used_today: int
    remaining: int
    percentage: float
    status: str  # "ok", "warning", "critical", "blocked"
    warning_message: str | None = None


def get_daily_limit(db: Session, provider_name: str = "mock") -> int:
    """Retrieve daily quota limit for a provider from DB or default config."""
    quota_setting = (
        db.query(ApiQuotaSetting)
        .filter(ApiQuotaSetting.provider_name == provider_name)
        .first()
    )
    if quota_setting:
        return quota_setting.daily_limit
    return settings.API_DAILY_LIMIT


def get_quota_status(db: Session, provider_name: str = "mock") -> QuotaStatus:
    """Calculate today's usage and return current quota status."""
    daily_limit = get_daily_limit(db, provider_name)

    # Start of today in UTC
    now_utc = datetime.now(timezone.utc)
    today_start = datetime.combine(now_utc.date(), time.min, tzinfo=timezone.utc)

    # Count successful/attempted calls today
    used_today = (
        db.query(func.count(ApiUsageLog.id))
        .filter(
            ApiUsageLog.provider_name == provider_name,
            ApiUsageLog.created_at >= today_start,
            ApiUsageLog.status != "blocked",
        )
        .scalar()
        or 0
    )

    remaining = max(0, daily_limit - used_today)
    percentage = round((used_today / daily_limit) * 100, 1) if daily_limit > 0 else 100.0

    warning_msg = None
    if percentage >= 100.0 or remaining == 0:
        quota_state = "blocked"
        warning_msg = (
            f"🚫 Daily API limit reached ({used_today}/{daily_limit} calls). "
            "Live updates and manual fetching are paused until the quota resets. "
            "Saved drafts are still available."
        )
    elif percentage >= 90.0:
        quota_state = "critical"
        warning_msg = (
            f"🔴 API usage critical: {used_today} / {daily_limit} calls used today ({percentage}%). "
            "Auto-refresh will stop at limit. Use manual fetching sparingly."
        )
    elif percentage >= 70.0:
        quota_state = "warning"
        warning_msg = (
            f"⚠️ API usage warning: {used_today} / {daily_limit} calls used today ({percentage}%). "
            "Live auto-refresh is active, but limit is approaching."
        )
    else:
        quota_state = "ok"

    return QuotaStatus(
        daily_limit=daily_limit,
        used_today=used_today,
        remaining=remaining,
        percentage=percentage,
        status=quota_state,
        warning_message=warning_msg,
    )


def record_api_call(
    db: Session,
    provider_name: str,
    endpoint: str,
    status_str: str = "success",
    workspace_id: int | None = None,
) -> ApiUsageLog:
    """Log an API call in the database."""
    log_entry = ApiUsageLog(
        workspace_id=workspace_id,
        provider_name=provider_name,
        endpoint=endpoint,
        status=status_str,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry


def enforce_quota_or_raise(
    db: Session,
    provider_name: str = "mock",
    workspace_id: int | None = None,
) -> QuotaStatus:
    """Verify that the daily quota has not been exceeded.

    If 100% exhausted, records a 'blocked' log entry and raises HTTP 429.
    """
    quota = get_quota_status(db, provider_name)
    if quota.status == "blocked":
        record_api_call(
            db,
            provider_name=provider_name,
            endpoint="quota_check",
            status_str="blocked",
            workspace_id=workspace_id,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=quota.warning_message or "Daily API quota limit reached. Fetching is paused until midnight UTC.",
        )
    return quota

