import httpx
from config import get_settings

settings = get_settings()


async def generate_review_response(review_text: str, rating: int, business_name: str) -> str:
    if not settings.openai_api_key:
        return _template_response(rating, business_name)

    prompt = (
        f"Write a professional, empathetic Google review response for {business_name}. "
        f"The customer gave {rating} stars and said: '{review_text}'. "
        f"Keep it under 100 words, warm, and avoid generic phrases."
    )

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 150,
            },
            timeout=15.0,
        )
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()


async def suggest_qa_answer(question: str, business_name: str) -> str:
    if not settings.openai_api_key:
        return f"Thank you for asking! At {business_name}, we'd be happy to help. Please contact us directly for the most accurate and up-to-date information on this topic."

    prompt = (
        f"Write a helpful, professional answer to this customer question for {business_name}: '{question}'. "
        f"Keep the answer under 80 words, friendly, and informative."
    )

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 120,
            },
            timeout=15.0,
        )
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()


def _template_response(rating: int, business_name: str) -> str:
    if rating >= 4:
        return f"Thank you so much for your wonderful review! We're thrilled you had a great experience at {business_name}. We look forward to seeing you again soon!"
    return f"Thank you for sharing your feedback. At {business_name}, we take all comments seriously and would love to make this right. Please reach out to us directly so we can address your concerns."
