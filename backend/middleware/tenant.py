from fastapi import Request, HTTPException
from sqlalchemy import select
from models.tenant import Tenant


async def resolve_tenant(request: Request):
    api_key = request.headers.get("X-API-Key") or request.query_params.get("api_key")
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")

    db = request.state.db
    result = await db.execute(select(Tenant).where(Tenant.api_key == api_key, Tenant.status == "active"))
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")

    request.state.tenant = tenant
    return tenant
