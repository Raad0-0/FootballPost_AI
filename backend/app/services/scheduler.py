"""Background scheduler for periodic live match monitoring."""

import logging
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import SessionLocal
from app.db.models import ClubWorkspace
from app.providers.mock_provider import get_football_provider
from app.services.match_service import monitor_live_match_for_workspace

logger = logging.getLogger("clubpost.scheduler")

scheduler = BackgroundScheduler()


def poll_active_matches() -> None:
    """Scheduled task that queries active matches and processes live updates."""
    db: Session = SessionLocal()
    provider = get_football_provider()
    try:
        workspaces = db.query(ClubWorkspace).all()
        for ws in workspaces:
            if ws.tracked_teams:
                try:
                    match, drafts = monitor_live_match_for_workspace(
                        db=db,
                        workspace=ws,
                        provider=provider,
                        is_manual=False,
                    )
                    if drafts:
                        logger.info(
                            "Workspace %s (%s): %d new draft(s) created for match %s",
                            ws.id,
                            ws.workspace_name,
                            len(drafts),
                            match.id if match else "N/A",
                        )
                except Exception as ex:
                    logger.warning("Error monitoring match for workspace %s: %s", ws.id, ex)
    finally:
        db.close()


def start_scheduler() -> None:
    """Start the background scheduler if not already running."""
    if not scheduler.running:
        interval_secs = max(30, settings.LIVE_POLL_INTERVAL_SECONDS)
        scheduler.add_job(
            poll_active_matches,
            "interval",
            seconds=interval_secs,
            id="live_match_poll_job",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("Background match monitoring scheduler started (interval: %ds).", interval_secs)


def stop_scheduler() -> None:
    """Shut down the background scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Background match monitoring scheduler stopped.")

