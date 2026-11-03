"""Pydantic v2 schemas for AI post generation and RSS news feeds."""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class ClubNewsResponse(BaseModel):
    """Schema for RSS news and transfer rumor articles."""

    id: int
    workspace_id: int
    headline: str
    summary: str | None = None
    source_url: str
    source_name: str
    category: str  # "news", "transfer"
    credibility_tier: str  # "tier1", "tier2", "rumor"
    published_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AIPostGenerateRequest(BaseModel):
    """Payload to trigger AI post generation for a match moment or news story."""

    context_type: str = Field(..., description="Event type: goal, halftime, fulltime, fixture, result, news, transfer")
    context_data: dict[str, Any] = Field(default_factory=dict, description="Structured facts about the event or story")
    tone: str | None = Field(default=None, description="Tone: hype, banter, professional (defaults to workspace setting)")
    language: str | None = Field(default=None, description="Language: english, banglish, bengali (defaults to workspace setting)")
    include_hashtags: bool = Field(default=True, description="Whether to append workspace default hashtags")


class AIPostGenerateResponse(BaseModel):
    """Generated 3 variations from a single Gemini request."""

    variations: dict[str, str] = Field(
        ...,
        description="Keys: 'short' (1-2 lines), 'story' (narrative), 'discussion' (comment-magnet question)",
    )
    tone_used: str
    language_used: str
    hashtags_appended: str

