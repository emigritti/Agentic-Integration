from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import UUID

import pytest

from app.agents.credential_recovery import CredentialRecoveryReflexAgent
from app.infra.cooldown import InMemoryCooldownStore
from app.infra.execution_log import InMemoryExecutionLog
from app.models.events import Event, EventType


def _make_event(payload: dict) -> Event:
    return Event(
        event_id=UUID("550e8400-e29b-41d4-a716-446655440000"),
        event_type=EventType.PASSWORD_RESET_REQUESTED,
        timestamp=datetime.now(timezone.utc),
        source="test",
        correlation_id=UUID("550e8400-e29b-41d4-a716-446655440001"),
        payload=payload,
    )


def _make_agent(
    identity=None,
    token=None,
    email=None,
    audit=None,
    cooldown=None,
    log=None,
) -> CredentialRecoveryReflexAgent:
    identity = identity or MagicMock(user_exists=MagicMock(return_value=True), is_account_locked=MagicMock(return_value=False), get_email=MagicMock(return_value="test@example.com"))
    token = token or MagicMock(generate_reset_token=MagicMock(return_value="tok123"))
    email = email or MagicMock(send_reset_email=MagicMock(return_value=True))
    audit = audit or MagicMock()
    cooldown = cooldown or InMemoryCooldownStore()
    log = log or InMemoryExecutionLog()
    return CredentialRecoveryReflexAgent(identity, token, email, audit, cooldown, log)


_VALID_PAYLOAD = {"user_id": "user-001", "email": "test@example.com", "trigger_source": "web"}


def test_u_cr_01_happy_path():
    agent = _make_agent()
    result = agent.run(_make_event(_VALID_PAYLOAD))
    assert result.status == "success"
    assert "reset_email_sent" in result.actions_taken


def test_u_cr_02_user_not_found():
    identity = MagicMock(user_exists=MagicMock(return_value=False), is_account_locked=MagicMock(return_value=False), get_email=MagicMock(return_value=None))
    agent = _make_agent(identity=identity)
    result = agent.run(_make_event(_VALID_PAYLOAD))
    assert result.status == "skipped"
    assert "non trovato" in result.outcome.lower()


def test_u_cr_03_account_locked():
    identity = MagicMock(user_exists=MagicMock(return_value=True), is_account_locked=MagicMock(return_value=True), get_email=MagicMock(return_value=None))
    agent = _make_agent(identity=identity)
    result = agent.run(_make_event(_VALID_PAYLOAD))
    assert result.status == "skipped"
    assert "bloccato" in result.outcome.lower()


def test_u_cr_04_cooldown_active():
    cooldown = InMemoryCooldownStore()
    cooldown.set_cooldown("credential_recovery", "user-001")
    agent = _make_agent(cooldown=cooldown)
    result = agent.run(_make_event(_VALID_PAYLOAD))
    assert result.status == "skipped"
    assert "cooldown" in result.outcome.lower()


def test_u_cr_05_email_exception_no_propagation():
    email = MagicMock(send_reset_email=MagicMock(side_effect=RuntimeError("SMTP down")))
    agent = _make_agent(email=email)
    result = agent.run(_make_event(_VALID_PAYLOAD))
    assert result.status == "error"


def test_u_cr_06_invalid_email_in_payload():
    agent = _make_agent()
    result = agent.run(_make_event({"user_id": "user-001", "email": "not-an-email"}))
    assert result.status == "error"
    assert "non valido" in result.outcome.lower()


def test_u_cr_07_missing_required_field():
    agent = _make_agent()
    result = agent.run(_make_event({"email": "test@example.com"}))  # missing user_id
    assert result.status == "error"


def test_u_cr_08_cooldown_set_on_success():
    cooldown = InMemoryCooldownStore()
    agent = _make_agent(cooldown=cooldown)
    agent.run(_make_event(_VALID_PAYLOAD))
    assert cooldown.is_in_cooldown("credential_recovery", "user-001")


def test_u_cr_09_audit_called_on_success():
    audit = MagicMock()
    agent = _make_agent(audit=audit)
    agent.run(_make_event(_VALID_PAYLOAD))
    audit.record.assert_called()


def test_u_cr_10_audit_called_on_email_error():
    email = MagicMock(send_reset_email=MagicMock(side_effect=RuntimeError("fail")))
    audit = MagicMock()
    agent = _make_agent(email=email, audit=audit)
    agent.run(_make_event(_VALID_PAYLOAD))
    audit.record.assert_called()
