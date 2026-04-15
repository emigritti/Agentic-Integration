import logging
import re

logger = logging.getLogger(__name__)

_VALID_USER_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")


class StubIdentityService:
    """Simulates an identity store. Any valid-format user_id is considered to exist."""

    def user_exists(self, user_id: str) -> bool:
        exists = bool(_VALID_USER_PATTERN.match(user_id))
        logger.debug("[IDENTITY STUB] user_exists(%s) -> %s", user_id, exists)
        return exists

    def is_account_locked(self, user_id: str) -> bool:
        logger.debug("[IDENTITY STUB] is_account_locked(%s) -> False", user_id)
        return False

    def get_email(self, user_id: str) -> str | None:
        return f"stub_{user_id}@example.com"
