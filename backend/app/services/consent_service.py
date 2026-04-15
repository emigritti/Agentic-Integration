import logging

logger = logging.getLogger(__name__)


class StubConsentService:
    """All customers have marketing consent in stub mode."""

    def has_marketing_consent(self, customer_id: str) -> bool:
        logger.debug("[CONSENT STUB] has_marketing_consent(%s) -> True", customer_id)
        return True
