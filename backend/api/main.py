from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.config import get_settings
from api.middleware.auth import AuthMiddleware
from api.routers import health, queue


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title="Resonance",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth middleware (if enabled)
settings = get_settings()
if settings.ui.auth.enabled:
    app.add_middleware(AuthMiddleware, auth_settings=settings.ui.auth)

# Include routers
app.include_router(health.router)
app.include_router(queue.router, prefix="/api/v1")

# Mount static files in production
static_path = Path("/app/static")
if static_path.exists():
    app.mount("/", StaticFiles(directory=static_path, html=True), name="static")
