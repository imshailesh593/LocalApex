import resend as resend_sdk
from config import get_settings

settings = get_settings()


def _client() -> resend_sdk.Emails:
    resend_sdk.api_key = settings.resend_api_key
    return resend_sdk.Emails


async def send_email(to: str, subject: str, html: str) -> None:
    if not settings.resend_api_key:
        return
    try:
        _client().send({
            "from": settings.resend_from_email,
            "to": [to],
            "subject": subject,
            "html": html,
        })
    except Exception:
        pass


def review_request_html(business_name: str, funnel_url: str, custom_message: str = "") -> str:
    message = custom_message or f"We'd love to hear about your recent experience at {business_name}."
    return f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#1d4ed8;padding:20px 24px">
        <h1 style="color:#fff;margin:0;font-size:18px">{business_name}</h1>
      </div>
      <div style="padding:28px 24px;text-align:center">
        <p style="font-size:28px;margin:0 0 12px">⭐⭐⭐⭐⭐</p>
        <p style="font-size:16px;color:#111;margin:0 0 8px;font-weight:600">How was your experience?</p>
        <p style="font-size:14px;color:#6b7280;margin:0 0 24px">{message}</p>
        <a href="{funnel_url}"
           style="display:inline-block;background:#1d4ed8;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">
          Leave a Review →
        </a>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;text-align:center">
        Sent by {business_name} via LocalApex
      </div>
    </div>
    """


def review_notification_html(business_name: str, reviewer: str, rating: int, comment: str, is_routed: bool) -> str:
    stars = "⭐" * rating
    color = "#16a34a" if is_routed else "#dc2626"
    label = "Positive → Routed to Google" if is_routed else "Negative → Captured Internally"
    return f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#1d4ed8;padding:20px 24px">
        <h1 style="color:#fff;margin:0;font-size:18px">New Review — {business_name}</h1>
      </div>
      <div style="padding:24px">
        <p style="font-size:13px;font-weight:600;color:{color};margin:0 0 12px">{label}</p>
        <p style="font-size:24px;margin:0 0 8px">{stars}</p>
        <p style="font-size:15px;font-weight:600;color:#111;margin:0 0 4px">{reviewer}</p>
        <p style="color:#6b7280;font-size:14px;margin:0 0 20px">{comment or "No comment."}</p>
      </div>
    </div>
    """
