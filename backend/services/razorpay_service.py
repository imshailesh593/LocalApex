import razorpay
import hmac, hashlib
from config import get_settings

settings = get_settings()

PLANS = {
    "starter_monthly": {
        "amount": 79900,  # ₹799 in paise
        "currency": "INR",
        "period": "monthly",
        "interval": 1,
        "tier": "starter",
    },
    "starter_annual": {
        "amount": 719100,  # ₹7191 (25% off) in paise
        "currency": "INR",
        "period": "yearly",
        "interval": 1,
        "tier": "starter",
    },
    "pro_monthly": {
        "amount": 199900,  # ₹1999 in paise
        "currency": "INR",
        "period": "monthly",
        "interval": 1,
        "tier": "pro",
    },
    "pro_annual": {
        "amount": 1799100,  # ₹17991 (25% off) in paise
        "currency": "INR",
        "period": "yearly",
        "interval": 1,
        "tier": "pro",
    },
}


def _client():
    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


def create_subscription(plan_key: str, tenant_id: str, customer_email: str) -> dict:
    client = _client()
    plan_cfg = PLANS[plan_key]

    # Create or fetch Razorpay plan
    plan = client.plan.create({
        "period": plan_cfg["period"],
        "interval": plan_cfg["interval"],
        "item": {
            "name": f"LocalApex {plan_cfg['tier'].title()} ({plan_cfg['period'].title()})",
            "amount": plan_cfg["amount"],
            "currency": plan_cfg["currency"],
        },
        "notes": {"plan_key": plan_key, "tenant_id": tenant_id},
    })

    subscription = client.subscription.create({
        "plan_id": plan["id"],
        "total_count": 120,
        "quantity": 1,
        "notes": {"tenant_id": tenant_id, "plan_key": plan_key},
        "notify_info": {
            "notify_phone": "",
            "notify_email": customer_email,
        },
    })

    return {
        "subscription_id": subscription["id"],
        "razorpay_key": settings.razorpay_key_id,
        "amount": plan_cfg["amount"],
        "currency": plan_cfg["currency"],
        "plan_key": plan_key,
        "tier": plan_cfg["tier"],
    }


def verify_payment_signature(payload: bytes, signature: str) -> bool:
    secret = settings.razorpay_webhook_secret.encode()
    expected = hmac.new(secret, payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_subscription_payment(
    razorpay_payment_id: str,
    razorpay_subscription_id: str,
    razorpay_signature: str,
) -> bool:
    msg = f"{razorpay_payment_id}|{razorpay_subscription_id}".encode()
    secret = settings.razorpay_key_secret.encode()
    expected = hmac.new(secret, msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, razorpay_signature)
