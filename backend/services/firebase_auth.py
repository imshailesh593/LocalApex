import firebase_admin
from firebase_admin import credentials, auth as fb_auth
from config import get_settings
import json, os

settings = get_settings()
_initialized = False


def _init():
    global _initialized
    if _initialized or firebase_admin._apps:
        return
    sa = settings.firebase_service_account_json
    if not sa:
        return
    try:
        cred_dict = json.loads(sa)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        _initialized = True
    except Exception:
        pass


def verify_firebase_token(id_token: str) -> dict:
    _init()
    if not _initialized and not firebase_admin._apps:
        raise ValueError("Firebase not configured")
    decoded = fb_auth.verify_id_token(id_token)
    return decoded
