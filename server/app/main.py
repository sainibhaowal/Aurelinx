"""
Main FastAPI application
Production-grade setup with middleware, exception handling, and security
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uuid
from datetime import datetime
import httpx

from app.models.database import create_db_and_tables
from app.core.config import settings
from app.core.logging_config import setup_logging, AurelinxException, get_logger
from app.core.provider_utils import build_local_provider_base_candidates
from app.api.v1 import (
    auth,
    employees,
    analysis,
    candidates,
    chat,
    enterprise,
    lean_enterprise,
    intelligence,
    integrations,
)

# Setup logging
logger_setup = setup_logging(settings.LOG_LEVEL)
logger = get_logger(__name__)

# ============ LIFESPAN EVENTS ============


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events"""
    # Startup
    logger.info(f"Starting Aurelinx API - Environment: {settings.ENVIRONMENT}")
    logger.info(
        f"Database: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'unknown'}"
    )

    try:
        create_db_and_tables()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}", exc_info=True)
        raise

    try:
        lean_enterprise.start_scheduler()
        logger.info("Lean enterprise scheduler started")
    except Exception as e:
        logger.warning(f"Could not start lean enterprise scheduler: {e}")

    yield

    # Shutdown
    try:
        lean_enterprise.stop_scheduler()
    except Exception:  # nosec B110
        pass
    logger.info("Shutting down Aurelinx API")


# ============ CREATE APP ============

app = FastAPI(
    title="Aurelinx Intelligence API",
    description="Production-grade HR Intelligence Platform with Agentic AI",
    version="1.0.0",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
)

# ============ MIDDLEWARE ============

# Trust proxy headers (for production deployments behind reverse proxy)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS or ["*"])

# Enforce HTTPS only when explicitly enabled behind a reverse proxy.
if settings.ENVIRONMENT == "production" and settings.REQUIRE_HTTPS:

    @app.middleware("http")
    async def enforce_https(request: Request, call_next):
        forwarded_proto = request.headers.get("x-forwarded-proto", "")
        scheme = request.url.scheme or "http"
        if forwarded_proto and forwarded_proto.lower() != "https":
            return JSONResponse(status_code=400, content={"detail": "HTTPS required"})
        if not forwarded_proto and scheme != "https":
            return JSONResponse(status_code=400, content={"detail": "HTTPS required"})
        return await call_next(request)


# CORS Configuration - Security focused
cors_allowed_origins = list(settings.ALLOWED_ORIGINS or [])
if settings.FRONTEND_URL:
    cors_allowed_origins.append(settings.FRONTEND_URL)
if settings.ENVIRONMENT != "production":
    cors_allowed_origins.extend(
        [
            "http://localhost:3000",
            "http://localhost:3100",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3100",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
        ]
    )
    cors_allowed_origins = sorted(set(cors_allowed_origins))

cors_allow_origin_regex = (
    settings.ALLOW_ORIGIN_REGEX or r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allowed_origins,
    allow_origin_regex=cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,  # Cache CORS headers for 1 hour
)

# ============ REQUEST ID MIDDLEWARE ============


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add request ID for tracking"""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    logger.info(f"[{request_id}] {request.method} {request.url.path}")

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id

    return response


# ============ EXCEPTION HANDLERS ============


@app.exception_handler(AurelinxException)
async def aurelinx_exception_handler(request: Request, exc: AurelinxException):
    """Handle custom Aurelinx exceptions"""
    request_id = getattr(request.state, "request_id", None)

    logger.error(
        f"[{request_id}] {exc.error_code}: {exc.message}",
        extra={
            "error_code": exc.error_code,
            "status_code": exc.status_code,
            "request_id": request_id,
        },
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "request_id": request_id,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler for unhandled errors"""
    request_id = getattr(request.state, "request_id", None)

    logger.error(
        f"[{request_id}] Unhandled exception: {str(exc)}",
        exc_info=True,
        extra={"request_id": request_id},
    )

    # Don't expose internal error details in production
    if settings.DEBUG:
        error_detail = str(exc)
    else:
        error_detail = "An unexpected error occurred"

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error_code": "INTERNAL_ERROR",
            "message": error_detail,
            "request_id": request_id,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


# ============ HEALTH CHECK ============


@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "aurelinx",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/", tags=["root"])
async def root():
    """Root endpoint"""
    return {
        "name": "Aurelinx Intelligence API",
        "version": "1.0.0",
        "docs": "/api/v1/docs",
        "status": "operational",
    }


# ============ API ROUTES ============

# Authentication routes
app.include_router(auth.router, prefix="/api/v1")

# Employee routes
app.include_router(employees.router, prefix="/api/v1")

# Analysis/AI routes
app.include_router(analysis.router, prefix="/api/v1")

# Candidate routes
app.include_router(candidates.router, prefix="/api/v1")

# Intelligence chat routes
app.include_router(chat.router, prefix="/api/v1")

# Enterprise intelligence routes
app.include_router(enterprise.router, prefix="/api/v1")
app.include_router(lean_enterprise.router, prefix="/api/v1")
app.include_router(intelligence.router, prefix="/api/v1")
app.include_router(integrations.router, prefix="/api/v1")


# Proxy routes
@app.get("/api/v1/proxy/models", tags=["proxy"])
async def proxy_models(url: str):
    """
    Proxy request to discover local LM Studio models.
    Prevents CORS issues when the frontend queries local services.
    """
    try:
        base_url = url.strip()
        if not base_url.endswith("/models") and not base_url.endswith("/models/"):
            if base_url.endswith("/v1") or base_url.endswith("/v1/"):
                base_url = base_url.rstrip("/") + "/models"
            else:
                base_url = base_url.rstrip("/") + "/v1/models"

        logger.info(f"Proxying model discovery to: {base_url}")
        async with httpx.AsyncClient(timeout=3.0) as client:
            candidate_urls = build_local_provider_base_candidates(base_url)
            last_error = None
            for candidate in candidate_urls:
                try:
                    resp = await client.get(candidate)
                    if resp.status_code == 200:
                        return resp.json()
                    last_error = f"status {resp.status_code}"
                except Exception as exc:
                    last_error = str(exc)
            logger.warning(f"LM Studio proxy discovery failed: {last_error}")
            return {"data": []}
    except Exception as e:
        logger.warning(f"LM Studio proxy discovery failed: {e}")
        return {"data": []}


# ============ STARTUP CHECKS ============


@app.on_event("startup")
async def startup_checks():
    """Run startup validation checks"""
    logger.info("Running startup checks...")

    # Check required environment variables
    if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
        raise RuntimeError("SECRET_KEY must be at least 32 characters")

    if not settings.DATABASE_URL:
        raise RuntimeError("DATABASE_URL is required")

    logger.info("✓ All startup checks passed")


# ============ SHUTDOWN ============


@app.on_event("shutdown")
async def shutdown():
    """Run shutdown cleanup"""
    logger.info("Application shutting down")
    # TODO: Cleanup connections, caches, etc.
