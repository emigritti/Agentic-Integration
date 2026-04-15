from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.agents.base import BaseReflexAgent
from app.infra.execution_log import ExecutionRecord, InMemoryExecutionLog
from app.infra.idempotency import InMemoryIdempotencyStore
from app.models.events import AgentResult, Event
from app.orchestrator.registry import AGENT_REGISTRY

logger = logging.getLogger(__name__)


class UnknownEventTypeError(ValueError):
    pass


class AgentOrchestrator:
    """Routes events to the correct agent and manages idempotency and execution logging.

    Does not contain business logic — only traffic control.
    """

    def __init__(
        self,
        agent_map: dict[str, BaseReflexAgent],
        idempotency_store: InMemoryIdempotencyStore,
        execution_log: InMemoryExecutionLog,
    ) -> None:
        self._agents = agent_map
        self._idempotency = idempotency_store
        self._exec_log = execution_log

    def process(self, event: Event) -> AgentResult:
        """Process an event. Returns cached result if already processed (idempotent)."""
        event_id = str(event.event_id)

        if self._idempotency.has_been_processed(event_id):
            logger.info("Duplicate event %s — returning cached result", event_id)
            cached = self._idempotency.get_result(event_id)
            assert cached is not None  # guaranteed by has_been_processed
            return cached

        agent_name = AGENT_REGISTRY.get(event.event_type)
        if agent_name is None:
            raise UnknownEventTypeError(f"No agent registered for event_type: {event.event_type}")

        agent = self._agents[agent_name]
        logger.info("Routing event %s (type=%s) to %s", event_id, event.event_type, agent_name)

        result = agent.run(event)

        self._idempotency.mark_processed(event_id, result)
        self._exec_log.append(
            ExecutionRecord(
                event_id=event_id,
                event_type=event.event_type.value,
                agent=agent_name,
                status=result.status,
                outcome=result.outcome,
                actions_taken=result.actions_taken,
                logs=[],  # populated by execution_log.append from pending_logs
                processed_at=result.processed_at.isoformat(),
            )
        )

        logger.info("Event %s processed: status=%s outcome=%s", event_id, result.status, result.outcome)
        return result
