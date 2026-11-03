"""FastAPI application entry point for the ClubPost API."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.database import init_db
from app.routes.auth import router as auth_router
from app.routes.drafts import router as drafts_router
from app.routes.matches import router as matches_router
from app.routes.news_ai import router as news_ai_router
from app.routes.teams import router as teams_router
from app.routes.usage import router as usage_router
from app.routes.workspaces import router as workspaces_router
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler: initialises DB and starts background scheduler."""
    init_db()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="ClubPost API",
    description="Football Club Content Assistant API",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS middleware
# ---------------------------------------------------------------------------
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
if "*" in origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://.*$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(workspaces_router)
app.include_router(teams_router)
app.include_router(matches_router)
app.include_router(news_ai_router)
app.include_router(drafts_router)
app.include_router(usage_router)


# ---------------------------------------------------------------------------
# Health check endpoint
# ---------------------------------------------------------------------------
@app.get("/api/health", tags=["health"], summary="Health check")
def health_check() -> dict:
    """Return a simple health-check response confirming the API is running."""
    return {"status": "ok", "app": "ClubPost API"}


# ---------------------------------------------------------------------------
# Static frontend SPA files (for single-container production deployment)
# ---------------------------------------------------------------------------
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))
if not os.path.isdir(static_dir):
    alt_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
    if os.path.isdir(alt_dist):
        static_dir = alt_dist

if os.path.isdir(static_dir):
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        target_file = os.path.join(static_dir, full_path)
        if full_path and os.path.isfile(target_file):
            return FileResponse(target_file)
        index_file = os.path.join(static_dir, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return {"status": "ok", "app": "ClubPost API"}
else:
    @app.get("/", tags=["health"], summary="Health check")
    def root_health() -> dict:
        return {"status": "ok", "app": "ClubPost API"}

