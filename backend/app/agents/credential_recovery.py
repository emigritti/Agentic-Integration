from __future__ import annotations

import logging
from datetime import datetime, timezone

from pydantic import ValidationError

from app.agents.base import BaseReflexAgent
from app.infra.cooldown import InMemoryCooldownStore
from app.infra.execution_log import ExecutionRecord, InMemoryExecutionLog
from app.models.events import AgentResult, Event, PasswordResetPayload
from app.services.protocols import (
    AuditServiceProtocol,
    EmailServiceProtocol,
    IdentityServiceProtocol,
    TokenServiceProtocol,
)

logger = logging.getLogger(__name__)

_AGENT_NAME = "CredentialRecoveryAgent"
_COOLDOWN_KEY = "credential_recovery"


class CredentialRecoveryReflexAgent(BaseReflexAgent):
    """Handles PASSWORD_RESET_REQUESTED events.

    Rules (evaluated in order, short-circuit on first failure):
    1. Payload valid
    2. User exists
    3. Account not locked
    4. Not in cooldown
    5. Generate token + send email + set cooldown + audit
    """

    def __init__(
        self,
        identity_service: IdentityServiceProtocol,
        token_service: TokenServiceProtocol,
        email_service: EmailServiceProtocol,
        audit_service: AuditServiceProtocol,
        cooldown_store: InMemoryCooldownStore,
        execution_log: InMemoryExecutionLog,
    ) -> None:
        self._identity = identity_service
        self._token = token_service
        self._email = email_service
        self._audit = audit_service
        self._cooldown = cooldown_store
        self._log = execution_log

    def run(self, event: Event) -> AgentResult:
        event_id = str(event.event_id)
        processed_at = datetime.now(timezone.utc)

        try:
            payload = PasswordResetPayload.model_validate(event.payload)
        except ValidationError as exc:
            return AgentResult(
                event_id=event.event_id,
                status="error",
                outcome=f"Payload non valido: {exc.error_count()} errore/i",
                actions_taken=[],
                processed_at=processed_at,
            )

        try:
            if not self._identity.user_exists(payload.user_id):
                self._audit.record(event_id, _AGENT_NAME, "skipped", "user_not_found")
                return self._skipped(event, "Utente non trovato", processed_at)

            if self._identity.is_account_locked(payload.user_id):
                self._audit.record(event_id, _AGENT_NAME, "skipped", "account_locked")
                return self._skipped(event, "Account bloccato", processed_at)

            if self._cooldown.is_in_cooldown(_COOLDOWN_KEY, payload.user_id):
                self._audit.record(event_id, _AGENT_NAME, "skipped", "cooldown_active")
                return self._skipped(event, "Cooldown attivo: riprova tra qualche minuto", processed_at)

            email = self._identity.get_email(payload.user_id) or payload.email
            token = self._token.generate_reset_token(payload.user_id)
            self._email.send_reset_email(email, token, payload.user_id)
            self._cooldown.set_cooldown(_COOLDOWN_KEY, payload.user_id)
            self._audit.record(event_id, _AGENT_NAME, "reset_email_sent")

            return AgentResult(
                event_id=event.event_id,
                status="success",
                outcome="Email di reset inviata con successo",
                actions_taken=["reset_token_generated", "reset_email_sent", "cooldown_set"],
                processed_at=processed_at,
            )

        except Exception as exc:  # noqa: BLE001
            logger.exception("Unexpected error in %s for event %s", _AGENT_NAME, event_id)
            self._audit.record(event_id, _AGENT_NAME, "error", str(type(exc).__name__))
            return AgentResult(
                event_id=event.event_id,
                status="error",
                outcome="Errore interno durante l'elaborazione",
                actions_taken=[],
                processed_at=processed_at,
            )

    @staticmethod
    def _skipped(event: Event, outcome: str, processed_at: datetime) -> AgentResult:
        return AgentResult(
            event_id=event.event_id,
            status="skipped",
            outcome=outcome,
            actions_taken=[],
            processed_at=processed_at,
        )
