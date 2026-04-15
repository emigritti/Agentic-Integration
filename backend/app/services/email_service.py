import logging

from app.infra.execution_log import InMemoryExecutionLog

logger = logging.getLogger(__name__)


class StubEmailService:
    def __init__(self, execution_log: InMemoryExecutionLog) -> None:
        self._log = execution_log

    def send_reset_email(self, email: str, token: str, user_id: str) -> bool:
        msg = f"[EMAIL STUB] Reset email sent for user_id={user_id} (token generated, email=***)"
        logger.info(msg)
        self._log.add_log(msg)
        return True

    def send_cart_reminder(self, email: str, cart_id: str, cart_value: float) -> bool:
        msg = f"[EMAIL STUB] Cart reminder sent for cart_id={cart_id} value={cart_value:.2f}"
        logger.info(msg)
        self._log.add_log(msg)
        return True
