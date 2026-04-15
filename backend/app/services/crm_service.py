import logging

from app.infra.execution_log import InMemoryExecutionLog

logger = logging.getLogger(__name__)


class StubCrmService:
    def __init__(self, execution_log: InMemoryExecutionLog) -> None:
        self._log = execution_log

    def update_campaign_state(self, customer_id: str, cart_id: str, state: str) -> None:
        msg = f"[CRM STUB] Campaign updated: customer_id={customer_id} cart_id={cart_id} state={state}"
        logger.info(msg)
        self._log.add_log(msg)
