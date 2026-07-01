"""
Google Business Profile API service.
Handles token refresh and all GBP API calls using the OAuth refresh token
stored per-tenant. All calls go through this module so token management
is centralised.
"""
import httpx
from config import get_settings

GBP_V4       = "https://mybusiness.googleapis.com/v4"
GBP_INFO     = "https://mybusinessbusinessinformation.googleapis.com/v1"
GBP_PERF     = "https://businessprofileperformance.googleapis.com/v1"
GBP_NOTIF    = "https://mybusinessnotifications.googleapis.com/v1"
GBP_ACTIONS  = "https://mybusinessplaceactions.googleapis.com/v1"
GBP_VERIFY   = "https://mybusinessverifications.googleapis.com/v1"
GBP_LODGING  = "https://mybusinesslodging.googleapis.com/v1"
TOKEN_URL    = "https://oauth2.googleapis.com/token"

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


# ── Notifications ─────────────────────────────────────────────────────────────

async def get_notification_settings(token: str, account_name: str) -> dict:
    """
    account_name: accounts/{accountId}
    Returns current notification settings (which events trigger alerts).
    """
    url = f"{GBP_NOTIF}/{account_name}/notificationSetting"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_headers(token))
    if resp.status_code != 200:
        raise RuntimeError(f"Notification settings fetch failed [{resp.status_code}]: {resp.text}")
    return resp.json()


async def update_notification_settings(token: str, account_name: str, notification_types: list[str]) -> dict:
    """
    notification_types: list of types to enable, e.g.
    ["NEW_REVIEW", "UPDATED_REVIEW", "NEW_CUSTOMER_MEDIA", "NEW_QUESTION", "UPDATED_QUESTION", "COMPETITOR_INSIGHTS"]
    """
    url = f"{GBP_NOTIF}/{account_name}/notificationSetting"
    payload = {
        "name": f"{account_name}/notificationSetting",
        "notificationTypes": notification_types,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            url,
            headers=_headers(token),
            params={"updateMask": "notificationTypes"},
            json=payload,
        )
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Notification update failed [{resp.status_code}]: {resp.text}")
    return resp.json()


# ── Place Actions (CTAs / Booking Links) ─────────────────────────────────────

async def list_place_actions(token: str, location_name: str) -> list[dict]:
    """List all CTA links on this listing (booking, ordering, reservations, etc.)."""
    url = f"{GBP_ACTIONS}/{location_name}/placeActionLinks"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_headers(token), params={"pageSize": 100})
    if resp.status_code != 200:
        raise RuntimeError(f"Place actions fetch failed [{resp.status_code}]: {resp.text}")
    return resp.json().get("placeActionLinks", [])


async def create_place_action(token: str, location_name: str, action_type: str, uri: str) -> dict:
    """
    action_type options:
      APPOINTMENT, ONLINE_APPOINTMENT, DINING_RESERVATION, FOOD_ORDERING,
      FOOD_DELIVERY, FOOD_TAKEOUT, SHOP_ONLINE
    """
    url = f"{GBP_ACTIONS}/{location_name}/placeActionLinks"
    payload = {"placeActionType": action_type, "uri": uri, "isPreferred": True}
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_headers(token), json=payload)
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Place action create failed [{resp.status_code}]: {resp.text}")
    return resp.json()


async def delete_place_action(token: str, action_name: str) -> None:
    """action_name: accounts/.../locations/.../placeActionLinks/{linkId}"""
    url = f"{GBP_ACTIONS}/{action_name}"
    async with httpx.AsyncClient() as client:
        resp = await client.delete(url, headers=_headers(token))
    if resp.status_code not in (200, 204):
        raise RuntimeError(f"Place action delete failed [{resp.status_code}]: {resp.text}")


async def list_place_action_types(token: str, location_name: str) -> list[dict]:
    """Returns which action types are available for this listing category."""
    url = f"{GBP_ACTIONS}/placeActionTypeMetadata"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_headers(token), params={"languageCode": "en"})
    if resp.status_code != 200:
        raise RuntimeError(f"Place action types fetch failed [{resp.status_code}]: {resp.text}")
    return resp.json().get("placeActionTypeMetadata", [])


# ── Verifications ─────────────────────────────────────────────────────────────

async def get_verification_state(token: str, location_name: str) -> dict:
    """
    Returns the verification state of a location.
    location_name: accounts/{accountId}/locations/{locationId}
    """
    url = f"{GBP_VERIFY}/{location_name}/verifications"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_headers(token))
    if resp.status_code != 200:
        raise RuntimeError(f"Verification state fetch failed [{resp.status_code}]: {resp.text}")
    return resp.json()


async def fetch_verification_options(token: str, location_name: str, language_code: str = "en") -> list[dict]:
    """List available verification methods (ADDRESS/postcard, PHONE_CALL, SMS, EMAIL, VETTED_PARTNER)."""
    url = f"{GBP_VERIFY}/{location_name}:fetchVerificationOptions"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url, headers=_headers(token), json={"languageCode": language_code}
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Verification options fetch failed [{resp.status_code}]: {resp.text}")
    return resp.json().get("options", [])


async def request_verification(token: str, location_name: str, method: str, context: dict | None = None) -> dict:
    """
    Initiate verification. method: ADDRESS | PHONE_CALL | SMS | EMAIL
    context: required for some methods, e.g. {"addressData": {"businessName": "..."}}
    """
    url = f"{GBP_VERIFY}/{location_name}:verify"
    payload = {"method": method}
    if context:
        payload.update(context)
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_headers(token), json=payload)
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Verification request failed [{resp.status_code}]: {resp.text}")
    return resp.json()


async def complete_verification(token: str, verification_name: str, pin: str) -> dict:
    """Complete verification by submitting the PIN received via postcard/phone/SMS."""
    url = f"{GBP_VERIFY}/{verification_name}:complete"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_headers(token), json={"pin": pin})
    if resp.status_code != 200:
        raise RuntimeError(f"Verification complete failed [{resp.status_code}]: {resp.text}")
    return resp.json()


# ── Lodging (Hotels / Resorts) ────────────────────────────────────────────────

async def get_lodging(token: str, location_name: str) -> dict:
    """Get full lodging info: amenities, pools, rooms, policies, etc."""
    url = f"{GBP_LODGING}/{location_name}/lodging"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_headers(token))
    if resp.status_code != 200:
        raise RuntimeError(f"Lodging fetch failed [{resp.status_code}]: {resp.text}")
    return resp.json()


async def update_lodging(token: str, location_name: str, lodging_data: dict, update_mask: str) -> dict:
    """Update lodging fields. update_mask: comma-separated field paths."""
    url = f"{GBP_LODGING}/{location_name}/lodging"
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            url,
            headers=_headers(token),
            params={"updateMask": update_mask},
            json=lodging_data,
        )
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Lodging update failed [{resp.status_code}]: {resp.text}")
    return resp.json()
