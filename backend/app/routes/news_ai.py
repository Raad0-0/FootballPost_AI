"""Routes for RSS news/transfers and Gemini AI multi-tone post generation."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import ClubWorkspace
from app.routes.workspaces import get_current_workspace
from app.schemas.ai import AIPostGenerateRequest, AIPostGenerateResponse, ClubNewsResponse
from app.services.gemini_service import generate_post_variations
from app.services.news_service import fetch_and_cache_club_news

router = APIRouter(prefix="/api/workspaces/{workspace_id}", tags=["news & ai"])


@router.get(
    "/news",
    response_model=list[ClubNewsResponse],
    summary="Get club news and transfer rumors with source links",
)
def get_club_news(
    force_refresh: bool = Query(default=False, description="Bypass cache and re-parse live RSS"),
    workspace: ClubWorkspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
) -> list[ClubNewsResponse]:
    """Fetch RSS news and transfer stories for the tracked club.

    Articles include headline, summary snippet, publication time, and original source URL.
    """
    news_items = fetch_and_cache_club_news(db, workspace, force_refresh=force_refresh)
    return [ClubNewsResponse.model_validate(item) for item in news_items]


@router.post(
    "/ai/generate",
    response_model=AIPostGenerateResponse,
    summary="Generate 3 social media post variations using Gemini AI",
)
async def generate_ai_post(
    payload: AIPostGenerateRequest,
    workspace: ClubWorkspace = Depends(get_current_workspace),
) -> AIPostGenerateResponse:
    """Generate 3 post variations (Short, Story, Discussion) in 1 single Gemini request.

    - Tones: 'hype', 'banter', 'professional' (defaults to workspace setting)
    - Languages: 'english', 'banglish', 'bengali' (defaults to workspace setting)
    - Automatically attaches workspace default hashtags.
    - Zero quota waste: Single API request produces all 3 variations!
    """
    effective_tone = (payload.tone or workspace.default_tone or "hype").lower()
    effective_lang = (payload.language or workspace.default_language or "english").lower()
    effective_tags = workspace.default_hashtags if payload.include_hashtags else ""

    variations = await generate_post_variations(
        context_type=payload.context_type,
        context_data=payload.context_data,
        tone=effective_tone,
        language=effective_lang,
        default_hashtags=effective_tags,
        api_key=workspace.gemini_api_key,
    )

    return AIPostGenerateResponse(
        variations=variations,
        tone_used=effective_tone,
        language_used=effective_lang,
        hashtags_appended=effective_tags or "",
    )

