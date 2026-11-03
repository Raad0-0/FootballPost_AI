"""API usage tracking routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.quota_service import get_quota_status

router = APIRouter(prefix="/api", tags=["usage"])


@router.get("/usage", summary="Get API quota usage statistics")
def get_usage(db: Session = Depends(get_db)) -> dict:
    """Return real-time API quota consumption and health warning level."""
    quota = get_quota_status(db, provider_name="mock")
    return {
        "daily_limit": quota.daily_limit,
        "used_today": quota.used_today,
        "remaining": quota.remaining,
        "percentage": quota.percentage,
        "status": quota.status,
        "warning_message": quota.warning_message,
    }
