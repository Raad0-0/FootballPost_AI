"""Workspace management routes with strict tenant isolation.

Every workspace operation verifies that the authenticated user is the owner.
A user cannot access, modify, or delete another user's workspace.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.db.models import ClubWorkspace, User
from app.routes.auth import get_current_user
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse, WorkspaceUpdate

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


def to_workspace_response(workspace: ClubWorkspace) -> WorkspaceResponse:
    """Format workspace response model, populating has_gemini_key."""
    has_key = bool(workspace.gemini_api_key or settings.GEMINI_API_KEY)
    return WorkspaceResponse(
        id=workspace.id,
        owner_user_id=workspace.owner_user_id,
        workspace_name=workspace.workspace_name,
        default_hashtags=workspace.default_hashtags or "",
        default_language=workspace.default_language or "english",
        default_tone=workspace.default_tone or "hype",
        has_gemini_key=has_key,
        created_at=workspace.created_at,
    )


def get_current_workspace(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClubWorkspace:
    """Dependency that retrieves a workspace and verifies the current user owns it.

    Returns 404 if the workspace does not exist or belongs to another user,
    preventing ID enumeration across tenants.
    """
    workspace = (
        db.query(ClubWorkspace)
        .filter(
            ClubWorkspace.id == workspace_id,
            ClubWorkspace.owner_user_id == current_user.id,
        )
        .first()
    )
    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )
    return workspace


@router.get(
    "",
    response_model=list[WorkspaceResponse],
    summary="List all workspaces owned by current user",
)
def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[WorkspaceResponse]:
    """Return all club workspaces owned by the authenticated user."""
    workspaces = (
        db.query(ClubWorkspace)
        .filter(ClubWorkspace.owner_user_id == current_user.id)
        .order_by(ClubWorkspace.created_at.asc())
        .all()
    )
    return [to_workspace_response(w) for w in workspaces]


@router.post(
    "",
    response_model=WorkspaceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workspace",
)
def create_workspace(
    payload: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkspaceResponse:
    """Create a new club workspace owned by the authenticated user."""
    workspace = ClubWorkspace(
        owner_user_id=current_user.id,
        workspace_name=payload.workspace_name,
        default_hashtags=payload.default_hashtags or "",
        default_language=payload.default_language or "english",
        default_tone=payload.default_tone or "hype",
        gemini_api_key=payload.gemini_api_key or None,
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return to_workspace_response(workspace)


@router.get(
    "/{workspace_id}",
    response_model=WorkspaceResponse,
    summary="Get details of a specific workspace",
)
def get_workspace(
    workspace: ClubWorkspace = Depends(get_current_workspace),
) -> WorkspaceResponse:
    """Return workspace details if owned by current user."""
    return to_workspace_response(workspace)


@router.patch(
    "/{workspace_id}",
    response_model=WorkspaceResponse,
    summary="Update workspace settings or rename",
)
def update_workspace(
    payload: WorkspaceUpdate,
    workspace: ClubWorkspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
) -> WorkspaceResponse:
    """Update name, hashtags, default tone/language, or Gemini API key for a workspace."""
    if payload.workspace_name is not None:
        workspace.workspace_name = payload.workspace_name
    if payload.default_hashtags is not None:
        workspace.default_hashtags = payload.default_hashtags
    if payload.default_language is not None:
        workspace.default_language = payload.default_language
    if payload.default_tone is not None:
        workspace.default_tone = payload.default_tone
    if payload.gemini_api_key is not None:
        workspace.gemini_api_key = payload.gemini_api_key.strip() or None

    db.commit()
    db.refresh(workspace)
    return to_workspace_response(workspace)


@router.delete(
    "/{workspace_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a workspace",
)
def delete_workspace(
    workspace: ClubWorkspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
) -> None:
    """Delete a workspace owned by current user."""
    db.delete(workspace)
    db.commit()
    return None
