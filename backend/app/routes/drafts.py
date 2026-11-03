"""Routes for post draft queue management."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import ClubWorkspace, PostDraft, User
from app.routes.auth import get_current_user
from app.routes.workspaces import get_current_workspace
from app.schemas.draft import PostDraftCreate, PostDraftResponse, PostDraftUpdate

router = APIRouter(tags=["drafts"])


def get_owned_draft(
    draft_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PostDraft:
    """Dependency ensuring the draft exists and belongs to a workspace owned by the current user."""
    draft = (
        db.query(PostDraft)
        .join(ClubWorkspace, PostDraft.workspace_id == ClubWorkspace.id)
        .filter(
            PostDraft.id == draft_id,
            ClubWorkspace.owner_user_id == current_user.id,
        )
        .first()
    )
    if draft is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found",
        )
    return draft


@router.get(
    "/api/workspaces/{workspace_id}/drafts",
    response_model=list[PostDraftResponse],
    summary="List post drafts for a workspace",
)
def list_drafts(
    post_type: str | None = Query(default=None, description="Filter by post type (e.g. goal, halftime, fulltime)"),
    status_filter: str | None = Query(default=None, alias="status", description="Filter by status (new, edited, copied, discarded, used)"),
    workspace: ClubWorkspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
) -> list[PostDraft]:
    """Retrieve post draft queue for the workspace."""
    # 1-Month retention cleanup: purge drafts older than 30 days
    from datetime import datetime, timedelta, timezone
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    db.query(PostDraft).filter(PostDraft.workspace_id == workspace.id, PostDraft.created_at < cutoff).delete()
    db.commit()

    query = (
        db.query(PostDraft)
        .filter(PostDraft.workspace_id == workspace.id)
    )
    if post_type:
        query = query.filter(PostDraft.post_type == post_type)
    if status_filter:
        query = query.filter(PostDraft.status == status_filter)

    return query.order_by(PostDraft.created_at.desc()).all()


@router.post(
    "/api/workspaces/{workspace_id}/drafts",
    response_model=PostDraftResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a custom post draft",
)
def create_custom_draft(
    payload: PostDraftCreate,
    workspace: ClubWorkspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
) -> PostDraft:
    """Create a manual post draft in this workspace."""
    draft = PostDraft(
        workspace_id=workspace.id,
        match_id=payload.match_id,
        post_type=payload.post_type,
        content=payload.content.strip(),
        status="new",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft


@router.get(
    "/api/drafts/{draft_id}",
    response_model=PostDraftResponse,
    summary="Get single draft details",
)
def get_draft(
    draft: PostDraft = Depends(get_owned_draft),
) -> PostDraft:
    """Fetch details of a single post draft."""
    return draft


@router.patch(
    "/api/drafts/{draft_id}",
    response_model=PostDraftResponse,
    summary="Edit content or change status of a post draft",
)
def update_draft(
    payload: PostDraftUpdate,
    draft: PostDraft = Depends(get_owned_draft),
    db: Session = Depends(get_db),
) -> PostDraft:
    """Update text or status of a draft (e.g., mark as edited, copied, used, or discarded)."""
    valid_statuses = {"new", "edited", "copied", "discarded", "used"}

    if payload.status:
        if payload.status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid status '{payload.status}'. Must be one of: {sorted(valid_statuses)}",
            )
        draft.status = payload.status

    if payload.content is not None:
        draft.content = payload.content.strip()
        # If user edited text without specifying status, automatically set to "edited"
        if payload.status is None:
            draft.status = "edited"

    db.commit()
    db.refresh(draft)
    return draft


@router.delete(
    "/api/drafts/{draft_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a post draft",
)
def delete_draft(
    draft: PostDraft = Depends(get_owned_draft),
    db: Session = Depends(get_db),
) -> None:
    """Delete a draft from the queue."""
    db.delete(draft)
    db.commit()
    return None

