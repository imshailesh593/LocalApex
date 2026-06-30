from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db
from auth import get_current_user
from models.tenant import Tenant
from models.zernio_account import ZernioAccount
from models.gbp_post import GbpPost
from services import zernio as zernio_svc
from config import get_settings
import uuid

router = APIRouter(prefix="/zernio", tags=["zernio"])

SUPPORTED_PLATFORMS = [
    "googlebusiness", "instagram", "facebook", "linkedin",
    "twitter", "tiktok", "youtube", "pinterest", "reddit",
    "bluesky", "threads", "telegram", "whatsapp", "discord", "snapchat",
]

PLATFORM_LABELS = {
    "googlebusiness": "Google Business Profile",
    "instagram": "Instagram",
    "facebook": "Facebook",
    "linkedin": "LinkedIn",
    "twitter": "X (Twitter)",
    "tiktok": "TikTok",
    "youtube": "YouTube",
    "pinterest": "Pinterest",
    "reddit": "Reddit",
    "bluesky": "Bluesky",
    "threads": "Threads",
    "telegram": "Telegram",
    "whatsapp": "WhatsApp",
    "discord": "Discord",
    "snapchat": "Snapchat",
}


async def _ensure_profile(tenant: Tenant, db: AsyncSession) -> str:
    """Get or create the Zernio profile for this tenant."""
    if tenant.zernio_profile_id:
        return tenant.zernio_profile_id
    settings = get_settings()
    if not settings.zernio_api_key:
        raise HTTPException(status_code=503, detail="Zernio not configured. Add ZERNIO_API_KEY to .env")
    try:
        profile_id = await zernio_svc.get_or_create_profile(tenant.business_name)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Zernio profile error: {e}")
    if not profile_id:
        raise HTTPException(status_code=502, detail="Zernio profile creation failed")
    tenant.zernio_profile_id = profile_id
    await db.commit()
    return profile_id


@router.get("/platforms")
async def list_platforms():
    return [{"platform": p, "label": PLATFORM_LABELS.get(p, p)} for p in SUPPORTED_PLATFORMS]


@router.get("/connect-url/{platform}")
async def get_connect_url(
    platform: str,
    db: AsyncSession = Depends(get_db),
    cu=Depends(get_current_user),
):
    if platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")
    tenant_r = await db.execute(select(Tenant).where(Tenant.id == cu["tenant_id"]))
    tenant = tenant_r.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    profile_id = await _ensure_profile(tenant, db)
    try:
        url = await zernio_svc.get_connect_url(platform, profile_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Zernio error: {e}")
    return {"connect_url": url, "profile_id": profile_id, "platform": platform}


@router.post("/accounts/sync")
async def sync_accounts(db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    """Pull all connected accounts from Zernio and upsert into our DB."""
    tenant_r = await db.execute(select(Tenant).where(Tenant.id == cu["tenant_id"]))
    tenant = tenant_r.scalar_one_or_none()
    if not tenant or not tenant.zernio_profile_id:
        return {"synced": 0, "accounts": []}

    try:
        remote = await zernio_svc.list_accounts(tenant.zernio_profile_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Zernio sync failed: {e}")

    synced = 0
    result_list = []
    for acct in remote:
        # Real Zernio response uses _id, not accountId
        acct_id = acct.get("_id") or acct.get("accountId") or acct.get("id")
        platform = acct.get("platform", "")
        username = acct.get("username") or acct.get("handle") or ""
        display_name = acct.get("displayName") or acct.get("name") or username

        existing = await db.execute(
            select(ZernioAccount).where(
                ZernioAccount.tenant_id == cu["tenant_id"],
                ZernioAccount.zernio_account_id == acct_id,
            )
        )
        row = existing.scalar_one_or_none()
        if row:
            row.username = username
            row.display_name = display_name
            row.is_active = True
        else:
            row = ZernioAccount(
                id=str(uuid.uuid4()),
                tenant_id=cu["tenant_id"],
                zernio_profile_id=tenant.zernio_profile_id,
                zernio_account_id=acct_id,
                platform=platform,
                username=username,
                display_name=display_name,
            )
            db.add(row)
            synced += 1
        result_list.append({"id": row.id, "platform": platform, "display_name": display_name, "username": username})

    await db.commit()
    return {"synced": synced, "accounts": result_list}


@router.get("/accounts")
async def list_accounts(db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    result = await db.execute(
        select(ZernioAccount).where(
            ZernioAccount.tenant_id == cu["tenant_id"],
            ZernioAccount.is_active == True,
        ).order_by(ZernioAccount.platform)
    )
    accounts = result.scalars().all()
    return [
        {
            "id": a.id,
            "platform": a.platform,
            "label": PLATFORM_LABELS.get(a.platform, a.platform),
            "username": a.username,
            "display_name": a.display_name,
            "zernio_account_id": a.zernio_account_id,
            "created_at": a.created_at,
        }
        for a in accounts
    ]


@router.delete("/accounts/{account_id}", status_code=204)
async def disconnect_account(account_id: str, db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    result = await db.execute(
        select(ZernioAccount).where(ZernioAccount.id == account_id, ZernioAccount.tenant_id == cu["tenant_id"])
    )
    acct = result.scalar_one_or_none()
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")
    acct.is_active = False
    await db.commit()


# ── Social / GBP Posts ───────────────────────────────────────────────────────

class PostCreate(BaseModel):
    zernio_account_id: str
    content: str
    platform: str = "googlebusiness"
    post_type: str = "whats_new"
    scheduled_at: str | None = None
    location_id: str | None = None


@router.post("/posts", status_code=201)
async def create_post(body: PostCreate, db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    tenant_r = await db.execute(select(Tenant).where(Tenant.id == cu["tenant_id"]))
    tenant = tenant_r.scalar_one_or_none()
    if not tenant or not tenant.zernio_profile_id:
        raise HTTPException(status_code=400, detail="Connect at least one social account first")

    # Verify this account belongs to this tenant
    acct_r = await db.execute(
        select(ZernioAccount).where(
            ZernioAccount.zernio_account_id == body.zernio_account_id,
            ZernioAccount.tenant_id == cu["tenant_id"],
            ZernioAccount.is_active == True,
        )
    )
    if not acct_r.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Account not connected to this tenant")

    try:
        zernio_resp = await zernio_svc.create_post(
            profile_id=tenant.zernio_profile_id,
            account_id=body.zernio_account_id,
            platform=body.platform,
            text=body.content,
            scheduled_at=body.scheduled_at,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Zernio post failed: {e}")

    # Real response uses _id
    zernio_post_id = zernio_resp.get("_id") or zernio_resp.get("id") or zernio_resp.get("postId")

    post = GbpPost(
        id=str(uuid.uuid4()),
        tenant_id=cu["tenant_id"],
        location_id=body.location_id,
        zernio_post_id=zernio_post_id,
        zernio_account_id=body.zernio_account_id,
        platform=body.platform,
        content=body.content,
        post_type=body.post_type,
        scheduled_at=None,
        status="scheduled" if body.scheduled_at else "published",
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return {"id": post.id, "status": post.status, "zernio_post_id": zernio_post_id}


@router.get("/posts")
async def list_posts(platform: str | None = None, db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    q = select(GbpPost).where(GbpPost.tenant_id == cu["tenant_id"])
    if platform:
        q = q.where(GbpPost.platform == platform)
    result = await db.execute(q.order_by(GbpPost.created_at.desc()).limit(100))
    posts = result.scalars().all()
    return [
        {
            "id": p.id,
            "platform": p.platform,
            "label": PLATFORM_LABELS.get(p.platform, p.platform),
            "content": p.content,
            "post_type": p.post_type,
            "status": p.status,
            "scheduled_at": p.scheduled_at,
            "published_at": p.published_at,
            "created_at": p.created_at,
            "location_id": p.location_id,
        }
        for p in posts
    ]
