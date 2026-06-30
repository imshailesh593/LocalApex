import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import get_settings

settings = get_settings()


def _send_sync(to: str, subject: str, html: str):
    if not settings.smtp_host or not settings.smtp_username:
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.smtp_username, settings.smtp_password)
        server.sendmail(settings.smtp_from_email, to, msg.as_string())


async def send_email(to: str, subject: str, html: str):
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, _send_sync, to, subject, html)
    except Exception:
        pass


def review_request_html(business_name: str, funnel_url: str, custom_message: str = "") -> str:
    message = custom_message or f"We'd love to hear about your recent experience at {business_name}. It only takes 30 seconds!"
    return f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#1d4ed8;padding:20px 24px">
        <h1 style="color:#fff;margin:0;font-size:18px">{business_name}</h1>
      </div>
      <div style="padding:28px 24px">
        <p style="font-size:28px;margin:0 0 12px;text-align:center">⭐⭐⭐⭐⭐</p>
        <p style="font-size:16px;color:#111;margin:0 0 20px;text-align:center;font-weight:600">How was your experience?</p>
        <p style="font-size:14px;color:#6b7280;margin:0 0 24px;text-align:center">{message}</p>
        <div style="text-align:center">
          <a href="{funnel_url}"
             style="display:inline-block;background:#1d4ed8;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">
            Leave a Review →
          </a>
        </div>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;text-align:center">
        Sent by {business_name} via LocalApex
      </div>
    </div>
    """


def review_notification_html(business_name: str, reviewer: str, rating: int, comment: str, is_routed: bool) -> str:
    stars = "⭐" * rating
    color = "#16a34a" if is_routed else "#dc2626"
    label = "Positive Review → Routed to Google" if is_routed else "Negative Review → Captured Internally"
    return f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#1d4ed8;padding:20px 24px">
        <h1 style="color:#fff;margin:0;font-size:18px">New Review — {business_name}</h1>
      </div>
      <div style="padding:24px">
        <p style="font-size:13px;font-weight:600;color:{color};margin:0 0 12px">{label}</p>
        <p style="font-size:24px;margin:0 0 8px">{stars}</p>
        <p style="font-size:15px;font-weight:600;color:#111;margin:0 0 4px">{reviewer}</p>
        <p style="color:#6b7280;font-size:14px;margin:0 0 20px">{comment or "No comment left."}</p>
        <a href="#" style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">
          View in LocalApex Dashboard
        </a>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af">
        Sent by LocalApex · Unsubscribe from review alerts
      </div>
    </div>
    """
