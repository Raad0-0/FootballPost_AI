"""Pydantic v2 schemas for social media post drafts."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PostDraftCreate(BaseModel):
    """Payload to create a manual post draft."""

    post_type: str = Field(..., description="Type of draft: goal, red_card, halftime, fulltime, fixture, result")
    content: str = Field(..., min_length=1, description="Post content text")
    match_id: int | None = None


class PostDraftUpdate(BaseModel):
    """Payload to edit draft text or update draft status."""

    content: str | None = None
    status: str | None = Field(
        default=None,
        description="Draft status: new, edited, copied, discarded, used",
    )


class PostDraftResponse(BaseModel):
    """Response model for a post draft."""

    id: int
    workspace_id: int
    match_id: int | None = None
    post_type: str
    content: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

