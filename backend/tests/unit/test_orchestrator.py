from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import UUID

import pytest

from app.infra.execution_log import InMemoryExecutionLog
from app.infra.idempotency import InMemoryIdempotencyStore
from app.models.events import AgentResult, Event, EventType
from app.orchestrator.orchestrator import AgentOrchestrator, UnknownEventTypeError


def _make_event(event_type=EventType.PASSWORD_RESET_REQUESTED) -> Event:
    return Event(
        event_id=UUID("550e8400-e29b-41d4-a716-446655440000"),
        event_type=event_type,
        timestamp=datetime.now(timezone.utc),
        source="test",
        correlation_id=UUID("550e8400-e29b-41d4-a716-446655440001"),
        payload={"user_id": "u1", "email": "t@example.com"},
    )


def _make_result(event: Event, status="success") -> AgentResult:
    return AgentResult(
        event_id=event.event_id,
        status=status,
        outcome="ok",
        actions_taken=["action_a"],
        processed_at=datetime.now(timezone.utc),
    )


def _make_orchestrator(agent_mock=None):
    idempotency = InMemoryIdempotencyStore()
    log = InMemoryExecutionLog()
    event = _make_event()
    agent = agent_mock or MagicMock(run=MagicMock(return_value=_make_result(event)))
    orchestrator = AgentOrchestrator(
        agent_map={"credential_recovery": agent, "cart_abandonment": MagicMock()},
        idempotency_store=idempotency,
        execution_log=log,
    )
    return orchestrator, idempotency, log, agent


def test_u_or_01_routes_to_correct_agent():
    orchestrator, _, _, agent = _make_orchestrator()
    event = _make_event(EventType.PASSWORD_RESET_REQUESTED)
    orchestrator.process(event)
    agent.run.assert_called_once_with(event)


def test_u_or_02_dedup_second_call_cached():
    orchestrator, _, _, agent = _make_orchestrator()
    event = _make_event()
    orchestrator.process(event)
    orchestrator.process(event)  # duplicate
    assert agent.run.call_count == 1


def test_u_or_03_unknown_event_type_raises():
    orchestrator, _, _, _ = _make_orchestrator()
    event = _make_event()
    # Hack the event_type to an unregistered value
    object.__setattr__(event, "event_type", "UNKNOWN_TYPE")
    with pytest.raises((UnknownEventTypeError, Exception)):
        orchestrator.process(event)


def test_u_or_04_result_stored_after_success():
    orchestrator, idempotency, _, _ = _make_orchestrator()
    event = _make_event()
    orchestrator.process(event)
    assert idempotency.has_been_processed(str(event.event_id))


def test_u_or_05_error_result_still_stored():
    event = _make_event()
    error_result = _make_result(event, status="error")
    agent = MagicMock(run=MagicMock(return_value=error_result))
    orchestrator, idempotency, _, _ = _make_orchestrator(agent_mock=agent)
    orchestrator.process(event)
    assert idempotency.has_been_processed(str(event.event_id))


def test_u_or_06_execution_log_appended():
    orchestrator, _, log, _ = _make_orchestrator()
    event = _make_event()
    orchestrator.process(event)
    records = log.get_all()
    assert len(records) == 1
    assert records[0].event_id == str(event.event_id)
