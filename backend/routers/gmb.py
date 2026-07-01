import httpx
import uuid
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from services.auth import get_current_user
from models.tenant import Tenant
from models.location import Location
from config import get_settings

router = APIRouter(prefix="/gmb", tags=["gmb"])

SCOPES = [
    "https://www.googleapis.com/auth/business.manage",
    "openid",
    "email",
]

GMB_ACCOUNT_URL = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts"
GMB_LOCATIONS_URL = "https://mybusinessbusinessinformation.googleapis.com/v1/{account}/locations"


def _oauth_redirect_uri(request: Request) -> str:
    return str(request.base_url).rstrip("/") + "/api/v1/gmb/callback"


@router.get("/connect")
async def gmb_connect(request: Request, cu=Depends(get_current_user)):
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env")

    redirect_uri = _oauth_redirect_uri(request)
    params = urlencode({
        "client_id": settings.google_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": cu["tenant_id"],
    })
    return {"connect_url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"}


@router.get("/callback")
async def gmb_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
    code: str = None,
    state: str = None,
    error: str = None,
    error_description: str = None,
):
    settings = get_settings()

    # Google returns error= if user denied or scope not added to consent screen
    if error:
        msg = error_description or error
        return RedirectResponse(
            f"{settings.frontend_url}/locations?gmb=error&reason={msg.replace(' ', '+')}"
        )

    if not code or not state:
        return RedirectResponse(f"{settings.frontend_url}/locations?gmb=error&reason=Missing+code+or+state")

    redirect_uri = _oauth_redirect_uri(request)

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post("https://oauth2.googleapis.com/token", data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        })
    if token_resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Google token exchange failed: {token_resp.text}")

    tokens = token_resp.json()
    access_token = tokens["access_token"]
    refresh_token = tokens.get("refresh_token", "")

    # Fetch GMB accounts (with retry on 429)
    import asyncio
    for attempt in range(3):
        async with httpx.AsyncClient(timeout=30.0) as client:
            accounts_resp = await client.get(
                GMB_ACCOUNT_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
        if accounts_resp.status_code == 429:
            if attempt < 2:
                await asyncio.sleep(2 ** attempt * 2)
                continue
            raise HTTPException(
                status_code=429,
                detail="Google API quota exceeded (0 req/min). Go to Google Cloud → "
                       "APIs & Services → My Business Account Management API → Quotas "
                       "→ request an increase for 'Requests per minute per project'."
            )
        break

    if accounts_resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"GMB accounts fetch failed: {accounts_resp.text}")

    accounts = accounts_resp.json().get("accounts", [])
    if not accounts:
        return RedirectResponse(f"{settings.frontend_url}/locations?gmb=no_accounts")

    tenant_id = state
    imported = 0

    for account in accounts:
        account_name = account.get("name")  # e.g. "accounts/123456"
        loc_url = GMB_LOCATIONS_URL.format(account=account_name)

        async with httpx.AsyncClient(timeout=30.0) as client:
            loc_resp = await client.get(
                loc_url,
                headers={"Authorization": f"Bearer {access_token}"},
                params={"readMask": "name,title,storefrontAddress,websiteUri,phoneNumbers,regularHours,categories,metadata"},
            )
        if loc_resp.status_code != 200:
            continue

        locations = loc_resp.json().get("locations", [])
        for loc in locations:
            title = loc.get("title", "")
            addr = loc.get("storefrontAddress", {})
            street = " ".join(filter(None, [
                addr.get("addressLines", [""])[0] if addr.get("addressLines") else "",
            ]))
            city = addr.get("locality", "")
            state_code = addr.get("administrativeArea", "")
            zip_code = addr.get("postalCode", "")
            country = addr.get("regionCode", "IN")
            phone = ""
            if loc.get("phoneNumbers", {}).get("primaryPhone"):
                phone = loc["phoneNumbers"]["primaryPhone"]
            website = loc.get("websiteUri", "")
            gmb_name = loc.get("name", "")  # e.g. "accounts/123/locations/456"

            # Check if already imported (by gmb resource name stored in funnel_slug prefix)
            existing = await db.execute(
                select(Location).where(
                    Location.tenant_id == tenant_id,
                    Location.store_name == title,
                )
            )
            if existing.scalar_one_or_none():
                continue  # already imported

            funnel_slug = title.lower().replace(" ", "-").replace("'", "")[:40] + "-" + str(uuid.uuid4())[:6]

            new_loc = Location(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                store_name=title,
                address=street,
                city=city,
                state=state_code,
                
                country=country,
                phone=phone,
                website=website,
                funnel_slug=funnel_slug,
                gbp_location_id=gmb_name,
            )
            db.add(new_loc)
            imported += 1

    # Store refresh token on tenant for future use
    tenant_r = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_r.scalar_one_or_none()
    if tenant:
        tenant.gmb_refresh_token = refresh_token

    await db.commit()
    return RedirectResponse(f"{settings.frontend_url}/locations?gmb=imported&count={imported}")


@router.post("/sync")
async def gmb_sync(db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    """Re-sync locations using stored refresh token."""
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google OAuth not configured")

    tenant_r = await db.execute(select(Tenant).where(Tenant.id == cu["tenant_id"]))
    tenant = tenant_r.scalar_one_or_none()
    if not tenant or not getattr(tenant, "gmb_refresh_token", None):
        raise HTTPException(status_code=400, detail="No Google account connected. Use /gmb/connect first.")

    # Refresh the access token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post("https://oauth2.googleapis.com/token", data={
            "refresh_token": tenant.gmb_refresh_token,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "grant_type": "refresh_token",
        })
    if token_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Token refresh failed. Reconnect Google account.")

    access_token = token_resp.json()["access_token"]

    async with httpx.AsyncClient() as client:
        accounts_resp = await client.get(GMB_ACCOUNT_URL, headers={"Authorization": f"Bearer {access_token}"})
    accounts = accounts_resp.json().get("accounts", [])

    imported = 0
    for account in accounts:
        account_name = account.get("name")
        async with httpx.AsyncClient() as client:
            loc_resp = await client.get(
                GMB_LOCATIONS_URL.format(account=account_name),
                headers={"Authorization": f"Bearer {access_token}"},
                params={"readMask": "name,title,storefrontAddress,websiteUri,phoneNumbers"},
            )
        for loc in loc_resp.json().get("locations", []):
            title = loc.get("title", "")
            existing = await db.execute(
                select(Location).where(Location.tenant_id == cu["tenant_id"], Location.store_name == title)
            )
            if existing.scalar_one_or_none():
                continue
            addr = loc.get("storefrontAddress", {})
            funnel_slug = title.lower().replace(" ", "-").replace("'", "")[:40] + "-" + str(uuid.uuid4())[:6]
            db.add(Location(
                id=str(uuid.uuid4()),
                tenant_id=cu["tenant_id"],
                store_name=title,
                address=" ".join(addr.get("addressLines", [])),
                city=addr.get("locality", ""),
                state=addr.get("administrativeArea", ""),
                
                country=addr.get("regionCode", "IN"),
                phone=loc.get("phoneNumbers", {}).get("primaryPhone", ""),
                website=loc.get("websiteUri", ""),
                funnel_slug=funnel_slug,
                gbp_location_id=loc.get("name", ""),
            ))
            imported += 1

    await db.commit()
    return {"imported": imported, "message": f"Imported {imported} new locations from Google Business Profile"}
