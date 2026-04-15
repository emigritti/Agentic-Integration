import logging

logger = logging.getLogger(__name__)


class StubCartService:
    """All carts are active (not purchased) in stub mode."""

    def is_purchased(self, cart_id: str) -> bool:
        logger.debug("[CART STUB] is_purchased(%s) -> False", cart_id)
        return False

    def get_customer_email(self, customer_id: str) -> str | None:
        return f"stub_{customer_id}@example.com"
