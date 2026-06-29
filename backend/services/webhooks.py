import hmac
import hashlib
import asyncio
import httpx
from datetime import datetime


def _sign(secret: str, payload: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


async def fire(url: str, secret: str, event: str, data: dict):
    import json
    body = json.dumps({"event": event, "timestamp": datetime.utcnow().isoformat(), "data": data}).encode()
    sig = _sign(secret, body)
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                url,
                content=body,
                headers={
                    "Content-Type": "application/json",
                    "X-LocalApex-Event": event,
                    "X-LocalApex-Signature": sig,
                },
                timeout=8.0,
            )
    except Exception:
        pass


async def fire_event(db, tenant_id: str, event: str, data: dict):
    from sqlalchemy import select
    from models.webhook import Webhook
    result = await db.execute(
        select(Webhook).where(
            Webhook.tenant_id == tenant_id,
            Webhook.is_active == True,
        )
    )
    hooks = result.scalars().all()
    tasks = [
        fire(h.url, h.secret, event, data)
        for h in hooks
        if event in h.events
    ]
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
