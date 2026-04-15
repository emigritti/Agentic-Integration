"""Dependency injection wiring.

This is the ONLY file that knows about concrete vs. stub implementations.
Swap stubs for real services here without touching any agent or service code.
"""
from __future__ import annotations

from app.agents.cart_abandonment import CartAbandonmentReflexAgent
from app.agents.credential_recovery import CredentialRecoveryReflexAgent
from app.config import get_settings
from app.infra.cooldown import InMemoryCooldownStore
from app.infra.execution_log import InMemoryExecutionLog
from app.infra.idempotency import InMemoryIdempotencyStore
from app.orchestrator.orchestrator import AgentOrchestrator
from app.services.audit_service import StubAuditService
from app.services.cart_service import StubCartService
from app.services.consent_service import StubConsentService
from app.services.crm_service import StubCrmService
from app.services.email_service import StubEmailService
from app.services.identity_service import StubIdentityService
from app.services.token_service import StubTokenService

# Module-level singletons — shared across all requests (application state, not request state)
_settings = get_settings()
_idempotency_store = InMemoryIdempotencyStore(ttl_seconds=_settings.idempotency_ttl_seconds)
_cooldown_store = InMemoryCooldownStore(ttl_seconds=_settings.cooldown_seconds)
_execution_log = InMemoryExecutionLog(max_size=_settings.max_executions_stored)


def get_idempotency_store() -> InMemoryIdempotencyStore:
    return _idempotency_store


def get_cooldown_store() -> InMemoryCooldownStore:
    return _cooldown_store


def get_execution_log() -> InMemoryExecutionLog:
    return _execution_log


def get_orchestrator() -> AgentOrchestrator:
    """Build the orchestrator with all agents wired up using module-level singletons.

    Called by FastAPI Depends() — no parameters so FastAPI does not try to inject
    non-Pydantic types as query/body params.
    """
    # Services (created per-call; lightweight stubs, no I/O)
    email_svc = StubEmailService(_execution_log)
    identity_svc = StubIdentityService()
    token_svc = StubTokenService()
    cart_svc = StubCartService()
    consent_svc = StubConsentService()
    crm_svc = StubCrmService(_execution_log)
    audit_svc = StubAuditService(_execution_log)

    # Agents
    credential_recovery_agent = CredentialRecoveryReflexAgent(
        identity_service=identity_svc,
        token_service=token_svc,
        email_service=email_svc,
        audit_service=audit_svc,
        cooldown_store=_cooldown_store,
        execution_log=_execution_log,
    )
    cart_abandonment_agent = CartAbandonmentReflexAgent(
        cart_service=cart_svc,
        consent_service=consent_svc,
        email_service=email_svc,
        crm_service=crm_svc,
        audit_service=audit_svc,
        cooldown_store=_cooldown_store,
        execution_log=_execution_log,
    )

    return AgentOrchestrator(
        agent_map={
            "credential_recovery": credential_recovery_agent,
            "cart_abandonment": cart_abandonment_agent,
        },
        idempotency_store=_idempotency_store,
        execution_log=_execution_log,
    )
