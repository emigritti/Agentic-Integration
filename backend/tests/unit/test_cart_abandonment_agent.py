from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import UUID

import pytest

from app.agents.cart_abandonment import CartAbandonmentReflexAgent
from app.infra.cooldown import InMemoryCooldownStore
from app.infra.execution_log import InMemoryExecutionLog
from app.models.events import Event, EventType


def _make_event(payload: dict) -> Event:
    return Event(
        event_id=UUID("660e8400-e29b-41d4-a716-446655440000"),
        event_type=EventType.CART_INACTIVE_24H,
        timestamp=datetime.now(timezone.utc),
        source="test",
        correlation_id=UUID("660e8400-e29b-41d4-a716-446655440001"),
        payload=payload,
    )


def _make_agent(cart=None, consent=None, email=None, crm=None, audit=None, cooldown=None, log=None):
    cart = cart or MagicMock(is_purchased=MagicMock(return_value=False), get_customer_email=MagicMock(return_value="cust@example.com"))
    consent = consent or MagicMock(has_marketing_consent=MagicMock(return_value=True))
    email = email or MagicMock(send_cart_reminder=MagicMock(return_value=True))
    crm = crm or MagicMock()
    audit = audit or MagicMock()
    cooldown = cooldown or InMemoryCooldownStore()
    log = log or InMemoryExecutionLog()
    return CartAbandonmentReflexAgent(cart, consent, email, crm, audit, cooldown, log)


_VALID_PAYLOAD = {"customer_id": "cust-001", "cart_id": "cart-001", "cart_value": 149.99}


def test_u_ca_01_happy_path():
    agent = _make_agent()
    result = agent.run(_make_event(_VALID_PAYLOAD))
    assert result.status == "success"
    assert "cart_reminder_email_sent" in result.actions_taken


def test_u_ca_02_cart_purchased():
    cart = MagicMock(is_purchased=MagicMock(return_value=True), get_customer_email=MagicMock(return_value=None))
    agent = _make_agent(cart=cart)
    result = agent.run(_make_event(_VALID_PAYLOAD))
    assert result.status == "skipped"
    assert "convertito" in result.outcome.lower()


def test_u_ca_03_no_consent():
    consent = MagicMock(has_marketing_consent=MagicMock(return_value=False))
    agent = _make_agent(consent=consent)
    result = agent.run(_make_event(_VALID_PAYLOAD))
    assert result.status == "skipped"
    assert "consenso" in result.outcome.lower()


def test_u_ca_04_cooldown_active():
    cooldown = InMemoryCooldownStore()
    cooldown.set_cooldown("cart_abandonment", "cart-001")
    agent = _make_agent(cooldown=cooldown)
    result = agent.run(_make_event(_VALID_PAYLOAD))
    assert result.status == "skipped"
    assert "già inviato" in result.outcome.lower()


def test_u_ca_05_email_exception_no_propagation():
    email = MagicMock(send_cart_reminder=MagicMock(side_effect=RuntimeError("fail")))
    agent = _make_agent(email=email)
    result = agent.run(_make_event(_VALID_PAYLOAD))
    assert result.status == "error"


def test_u_ca_06_cart_value_zero():
    agent = _make_agent()
    result = agent.run(_make_event({"customer_id": "cust-001", "cart_id": "cart-001", "cart_value": 0}))
    assert result.status == "error"


def test_u_ca_07_cart_value_negative():
    agent = _make_agent()
    result = agent.run(_make_event({"customer_id": "cust-001", "cart_id": "cart-001", "cart_value": -10}))
    assert result.status == "error"


def test_u_ca_08_crm_updated_on_success():
    crm = MagicMock()
    agent = _make_agent(crm=crm)
    agent.run(_make_event(_VALID_PAYLOAD))
    crm.update_campaign_state.assert_called_once()


def test_u_ca_09_crm_not_called_when_skipped():
    cart = MagicMock(is_purchased=MagicMock(return_value=True), get_customer_email=MagicMock(return_value=None))
    crm = MagicMock()
    agent = _make_agent(cart=cart, crm=crm)
    agent.run(_make_event(_VALID_PAYLOAD))
    crm.update_campaign_state.assert_not_called()
