"""
Google Business Profile API service.
Handles token refresh and all GBP API calls using the OAuth refresh token
stored per-tenant. All calls go through this module so token management
is centralised.
"""
import httpx
from config import get_settings

GBP_V4 = "https://mybusiness.googleapis.com/v4"
GBP_INFO = "https://mybusinessbusinessinformation.googleapis.com/v1"
GBP_PERF = "https://businessprofileperformance.googleapis.com/v1"
TOKEN_URL = "https://oauth2.googleapis.com/token"

ALL_METRICS = [
    "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
    "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
    "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
    "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
    "CALL_CLICKS",
    "WEBSITE_CLICKS",
    "BUSINESS_DIRECTION_REQUESTS",
    "BUSINESS_BOOKINGS",
    "BUSINESS_FOOD_ORDERS",
]


async def get_access_token(refresh_token: str) -> str:
    """Exchange refresh token for a fresh access token."""
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.post(TOKEN_URL, data={
            "refresh_token": refresh_token,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "grant_type": "refresh_token",
        })
    if resp.status_code != 200:
        raise RuntimeError(f"Token refresh failed: {resp.text}")
    return resp.json()["access_token"]


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Reviews ──────────────────────────────────────────────────────────────────

async def list_reviews(token: str, location_name: str) -> list[dict]:
    """
    location_name format: accounts/{accountId}/locations/{locationId}
    Returns list of review dicts from Google.
    """
    url = f"{GBP_V4}/{location_name}/reviews"
    reviews = []
    page_token = None
    async with httpx.AsyncClient() as client:
        while True:
            params = {"pageSize": 50}
            if page_token:
                params["pageToken"] = page_token
            resp = await client.get(url, headers=_headers(token), params=params)
            if resp.status_code != 200:
                raise RuntimeError(f"GBP reviews fetch failed [{resp.status_code}]: {resp.text}")
            data = resp.json()
            reviews.extend(data.get("reviews", []))
            page_token = data.get("nextPageToken")
            if not page_token:
                break
    return reviews


async def reply_to_review(token: str, review_name: str, reply_text: str) -> dict:
    """
    review_name format: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
    """
    url = f"{GBP_V4}/{review_name}/reply"
    async with httpx.AsyncClient() as client:
        resp = await client.put(url, headers=_headers(token), json={"comment": reply_text})
    if resp.status_code not in (200, 204):
        raise RuntimeError(f"GBP reply failed [{resp.status_code}]: {resp.text}")
    return resp.json() if resp.content else {}


async def delete_review_reply(token: str, review_name: str) -> None:
    url = f"{GBP_V4}/{review_name}/reply"
    async with httpx.AsyncClient() as client:
        resp = await client.delete(url, headers=_headers(token))
    if resp.status_code not in (200, 204):
        raise RuntimeError(f"GBP delete reply failed [{resp.status_code}]: {resp.text}")


# ── Media / Photos ────────────────────────────────────────────────────────────

async def list_media(token: str, location_name: str) -> list[dict]:
    url = f"{GBP_V4}/{location_name}/media"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_headers(token), params={"pageSize": 100})
    if resp.status_code != 200:
        raise RuntimeError(f"GBP media fetch failed [{resp.status_code}]: {resp.text}")
    return resp.json().get("mediaItems", [])


async def upload_media(token: str, location_name: str, media_format: str, source_url: str, category: str = "ADDITIONAL") -> dict:
    """
    Upload a photo to GBP from a publicly accessible URL.
    media_format: PHOTO or VIDEO
    category: COVER, PROFILE, LOGO, EXTERIOR, INTERIOR, PRODUCT, AT_WORK, FOOD_AND_DRINK, MENU, COMMON_AREA, ROOMS, TEAMS, ADDITIONAL
    """
    url = f"{GBP_V4}/{location_name}/media"
    payload = {
        "mediaFormat": media_format,
        "locationAssociation": {"category": category},
        "sourceUrl": source_url,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_headers(token), json=payload)
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"GBP media upload failed [{resp.status_code}]: {resp.text}")
    return resp.json()


async def delete_media(token: str, media_name: str) -> None:
    url = f"{GBP_V4}/{media_name}"
    async with httpx.AsyncClient() as client:
        resp = await client.delete(url, headers=_headers(token))
    if resp.status_code not in (200, 204):
        raise RuntimeError(f"GBP media delete failed [{resp.status_code}]: {resp.text}")


# ── Q&A ───────────────────────────────────────────────────────────────────────

async def list_questions(token: str, location_name: str) -> list[dict]:
    url = f"{GBP_V4}/{location_name}/questions"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_headers(token), params={"pageSize": 100, "answersPerQuestion": 5})
    if resp.status_code != 200:
        raise RuntimeError(f"GBP Q&A fetch failed [{resp.status_code}]: {resp.text}")
    return resp.json().get("questions", [])


async def answer_question(token: str, question_name: str, answer_text: str) -> dict:
    # question_name: accounts/{accountId}/locations/{locationId}/questions/{questionId}
    url = f"{GBP_V4}/{question_name}/answers:upsert"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_headers(token), json={"answer": {"text": answer_text}})
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"GBP answer failed [{resp.status_code}]: {resp.text}")
    return resp.json()


# ── Business Profile / SEO ────────────────────────────────────────────────────

PROFILE_READ_MASK = ",".join([
    "name", "title", "storefrontAddress", "websiteUri",
    "phoneNumbers", "regularHours", "specialHours",
    "categories", "profile", "serviceItems", "labels",
    "openInfo", "metadata", "moreHours",
])


async def get_location_profile(token: str, location_name: str) -> dict:
    """
    location_name: accounts/{accountId}/locations/{locationId}
    Returns full business profile including SEO fields.
    """
    url = f"{GBP_INFO}/locations/{location_name.split('locations/')[-1]}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_headers(token), params={"readMask": PROFILE_READ_MASK})
    if resp.status_code != 200:
        raise RuntimeError(f"GBP profile fetch failed [{resp.status_code}]: {resp.text}")
    return resp.json()


async def update_location_profile(token: str, location_name: str, update_data: dict, update_mask: str) -> dict:
    """
    update_mask: comma-separated list of fields to update
    e.g. "title,websiteUri,regularHours,profile.description"
    """
    location_id = location_name.split("locations/")[-1]
    url = f"{GBP_INFO}/locations/{location_id}"
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            url,
            headers=_headers(token),
            params={"updateMask": update_mask},
            json=update_data,
        )
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"GBP profile update failed [{resp.status_code}]: {resp.text}")
    return resp.json()


# ── Performance / Insights ────────────────────────────────────────────────────

async def get_performance(
    token: str,
    location_name: str,
    start_date: tuple[int, int, int],
    end_date: tuple[int, int, int],
    metrics: list[str] | None = None,
) -> dict:
    """
    Fetch daily performance metrics from the Business Profile Performance API.
    location_name: accounts/{accountId}/locations/{locationId}
    start_date / end_date: (year, month, day) tuples
    Returns raw API response with multiDailyMetricTimeSeries.
    """
    # Performance API uses just the location id portion
    loc_id = location_name.split("locations/")[-1]
    url = f"{GBP_PERF}/locations/{loc_id}:fetchMultiDailyMetricsTimeSeries"

    selected = metrics or ALL_METRICS
    params = [
        ("dailyRange.startDate.year", start_date[0]),
        ("dailyRange.startDate.month", start_date[1]),
        ("dailyRange.startDate.day", start_date[2]),
        ("dailyRange.endDate.year", end_date[0]),
        ("dailyRange.endDate.month", end_date[1]),
        ("dailyRange.endDate.day", end_date[2]),
    ]
    for m in selected:
        params.append(("dailyMetrics", m))

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_headers(token), params=params)

    if resp.status_code != 200:
        raise RuntimeError(f"GBP performance fetch failed [{resp.status_code}]: {resp.text}")
    return resp.json()
