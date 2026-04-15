import logging
import secrets

logger = logging.getLogger(__name__)


class StubTokenService:
    def generate_reset_token(self, user_id: str) -> str:
        token = secrets.token_urlsafe(32)
        logger.debug("[TOKEN STUB] Generated reset token for user_id=%s", user_id)
        return token
