from models.review import ReviewFunnel, ReviewStatus


def should_route_to_google(review: ReviewFunnel) -> bool:
    return review.rating >= 4


def process_review(review: ReviewFunnel) -> ReviewFunnel:
    if should_route_to_google(review):
        review.is_routed = True
        review.status = ReviewStatus.routed
    else:
        review.is_routed = False
        review.status = ReviewStatus.suppressed
    return review
