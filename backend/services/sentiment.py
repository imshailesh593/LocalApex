import re


def classify_sentiment(rating: int, comment: str | None) -> str:
    """Rule-based sentiment: rating is the primary signal; comment refines it."""
    text = (comment or "").lower()

    negative_words = {
        "bad", "terrible", "awful", "horrible", "worst", "disgusting", "rude",
        "waste", "scam", "fraud", "dirty", "broken", "slow", "expensive",
        "disappointed", "unprofessional", "never again", "poor", "useless",
    }
    positive_words = {
        "great", "excellent", "amazing", "fantastic", "wonderful", "love",
        "best", "perfect", "outstanding", "superb", "awesome", "happy",
        "satisfied", "recommend", "good", "nice", "helpful", "friendly",
    }

    neg_count = sum(1 for w in negative_words if re.search(r'\b' + w + r'\b', text))
    pos_count = sum(1 for w in positive_words if re.search(r'\b' + w + r'\b', text))

    if rating >= 4:
        return "negative" if neg_count > pos_count + 1 else "positive"
    elif rating == 3:
        if pos_count > neg_count:
            return "positive"
        if neg_count > pos_count:
            return "negative"
        return "neutral"
    else:
        return "positive" if pos_count > neg_count + 1 else "negative"
