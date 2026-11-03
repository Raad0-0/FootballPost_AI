"""Pydantic v2 schemas for workspace operations."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceCreate(BaseModel):
    """Payload for creating a new workspace."""

    workspace_name: str = Field(..., min_length=1, max_length=255, description="Name of the workspace/club page")
    default_hashtags: str | None = Field(default="", description="Default hashtags to append, e.g. #COYG #Arsenal")
    default_language: str = Field(default="english", description="Preferred output language: english, banglish, bengali")
    default_tone: str = Field(default="hype", description="Preferred post tone: hype, banter, professional")
    gemini_api_key: str | None = Field(default=None, description="Optional Google Gemini API key")


class WorkspaceUpdate(BaseModel):
    """Payload for updating workspace settings."""

    workspace_name: str | None = Field(default=None, min_length=1, max_length=255, description="New name of the workspace")
    default_hashtags: str | None = Field(default=None, description="Default hashtags to append")
    default_language: str | None = Field(default=None, description="Preferred output language: english, banglish, bengali")
    default_tone: str | None = Field(default=None, description="Preferred post tone: hype, banter, professional")
    gemini_api_key: str | None = Field(default=None, description="Google Gemini API key")


class WorkspaceResponse(BaseModel):
    """Workspace response model."""

    id: int
    owner_user_id: int
    workspace_name: str
    default_hashtags: str | None = ""
    default_language: str = "english"
    default_tone: str = "hype"
    has_gemini_key: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
