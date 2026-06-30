import httpx
from config import get_settings

ZERNIO_BASE = "https://zernio.com/api/v1"


def _headers() -> dict:
    settings = get_settings()
    return {"Authorization": f"Bearer {settings.zernio_api_key}", "Content-Type": "application/json"}


async def get_or_create_profile(business_name: str) -> str:
    """Return the default profile ID, or create one."""
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{ZERNIO_BASE}/profiles", headers=_headers(), timeout=15)
        r.raise_for_status()
        data = r.json()
        profiles = data.get("profiles", data) if isinstance(data, dict) else data
        if profiles:
            # Use first (default) profile
            return profiles[0].get("_id") or profiles[0].get("id")
        # No profiles yet — create one
        r2 = await client.post(f"{ZERNIO_BASE}/profiles", json={"name": business_name}, headers=_headers(), timeout=15)
        r2.raise_for_status()
        created = r2.json()
        profile = created.get("profile", created)
        return profile.get("_id") or profile.get("id")


async def get_connect_url(platform: str, profile_id: str) -> str:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ZERNIO_BASE}/connect/{platform}",
            params={"profileId": profile_id},
            headers=_headers(),
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        # Actual response field is "authUrl"
        return data.get("authUrl") or data.get("url") or data.get("connectUrl") or str(data)


async def list_accounts(profile_id: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ZERNIO_BASE}/accounts",
            params={"profileId": profile_id, "limit": 100},
            headers=_headers(),
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        # Actual response: {"accounts": [...]}
        accounts = data.get("accounts", data) if isinstance(data, dict) else data
        return accounts


async def create_post(
    profile_id: str,
    account_id: str,
    platform: str,
    text: str,
    scheduled_at: str | None = None,
) -> dict:
    payload: dict = {
        "profileId": profile_id,
        "content": text,
        # Actual required format: platforms array with accountId
        "platforms": [{"platform": platform, "accountId": account_id}],
    }
    if scheduled_at:
        payload["scheduledAt"] = scheduled_at
    else:
        payload["publishNow"] = True

    async with httpx.AsyncClient() as client:
        r = await client.post(f"{ZERNIO_BASE}/posts", json=payload, headers=_headers(), timeout=20)
        r.raise_for_status()
        data = r.json()
        return data.get("post", data)
