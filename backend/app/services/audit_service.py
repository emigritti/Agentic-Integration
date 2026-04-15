import logging

from app.infra.execution_log import InMemoryExecutionLog

logger = logging.getLogger(__name__)


class StubAuditService:
    """Logs audit events to stdout and the in-memory execution log. No PII logged."""

    def __init__(self, execution_log: InMemoryExecutionLog) -> None:
        self._log = execution_log

    def record(self, event_id: str, agent: str, outcome: str, detail: str = "") -> None:
        msg = f"[AUDIT] event_id={event_id} agent={agent} outcome={outcome}"
        if detail:
            msg += f" detail={detail}"
        logger.info(msg)
        self._log.add_log(msg)
