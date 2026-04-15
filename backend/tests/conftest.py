from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.infra.cooldown import InMemoryCooldownStore
from app.infra.execution_log import InMemoryExecutionLog
from app.infra.idempotency import InMemoryIdempotencyStore
from app.main import app
from app.dependencies import get_execution_log, get_idempotency_store, get_cooldown_store


@pytest.fixture(autouse=True)
def clear_stores():
    """Reset all in-memory stores before each test to ensure isolation."""
    from app import dependencies as deps
    deps._idempotency_store.clear() if hasattr(deps._idempotency_store, 'clear') else None
    deps._cooldown_store.clear()
    deps._execution_log.clear()
    yield
    deps._idempotency_store._store.clear()
    deps._cooldown_store.clear()
    deps._execution_log.clear()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def valid_password_reset_event():
    return {
        "event_id": "550e8400-e29b-41d4-a716-446655440000",
        "event_type": "PASSWORD_RESET_REQUESTED",
        "timestamp": "2026-04-15T10:00:00Z",
        "source": "dashboard",
        "correlation_id": "550e8400-e29b-41d4-a716-446655440001",
        "payload": {
            "user_id": "user-001",
            "email": "test@example.com",
            "trigger_source": "web",
        },
    }


@pytest.fixture
def valid_cart_event():
    return {
        "event_id": "660e8400-e29b-41d4-a716-446655440000",
        "event_type": "CART_INACTIVE_24H",
        "timestamp": "2026-04-15T10:00:00Z",
        "source": "scheduler",
        "correlation_id": "660e8400-e29b-41d4-a716-446655440001",
        "payload": {
            "customer_id": "cust-001",
            "cart_id": "cart-001",
            "cart_value": 149.99,
        },
    }
