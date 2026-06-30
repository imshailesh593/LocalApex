import httpx
from config import get_settings

ZERNIO_BASE = "https://zernio.com/api/v1"

def _headers() -> dict:
    settings = get_settings()
    return {"Authorization": f"Bearer {settings.zernio_api_key}", "Content-Type": "application/json"}


async def create_profile(name: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{ZERNIO_BASE}/profiles", json={"name": name}, headers=_headers(), timeout=15)
        r.raise_for_status()
        return r.json()


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
        # Zernio returns either a direct URL or an object with url/authUrl field
        if isinstance(data, str):
            return data
        return data.get("url") or data.get("authUrl") or data.get("connectUrl") or str(data)


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
        if isinstance(data, list):
            return data
        return data.get("data") or data.get("accounts") or []


async def create_post(
    profile_id: str,
    account_ids: list[str],
    text: str,
    platform: str = "googlebusiness",
    scheduled_at: str | None = None,
) -> dict:
    payload: dict = {
        "profileId": profile_id,
        "text": text,
        "socialAccountIds": account_ids,
    }
    if scheduled_at:
        payload["scheduledAt"] = scheduled_at
    else:
        payload["publishNow"] = True

    async with httpx.AsyncClient() as client:
        r = await client.post(f"{ZERNIO_BASE}/posts", json=payload, headers=_headers(), timeout=20)
        r.raise_for_status()
        return r.json()
