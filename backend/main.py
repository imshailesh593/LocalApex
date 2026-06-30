from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from config import get_settings
from database import engine, Base
from routers import auth, tenants, locations, reviews, competitors, citations, qa, media, insights, nap, search, notifications, templates, reports, webhooks, activity, billing, widget, campaigns, notification_prefs, public, zernio, admin

settings = get_settings()

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(
    title="LocalApex API",
    description="Multi-tenant Local SEO SaaS Platform",
    version="1.0.0",
    docs_url="/docs" if settings.app_debug else None,
    redoc_url="/redoc" if settings.app_debug else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(auth.router, prefix="/api/v1")
app.include_router(tenants.router, prefix="/api/v1")
app.include_router(locations.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
app.include_router(competitors.router, prefix="/api/v1")
app.include_router(citations.router, prefix="/api/v1")
app.include_router(qa.router, prefix="/api/v1")
app.include_router(media.router, prefix="/api/v1")
app.include_router(insights.router, prefix="/api/v1")
app.include_router(nap.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(templates.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(activity.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")
app.include_router(widget.router, prefix="/api/v1")
app.include_router(campaigns.router, prefix="/api/v1")
app.include_router(notification_prefs.router, prefix="/api/v1")
app.include_router(public.router, prefix="/api/v1")
app.include_router(zernio.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name}
