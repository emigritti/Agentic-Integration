from __future__ import annotations

import logging
from datetime import datetime, timezone

from pydantic import ValidationError

from app.agents.base import BaseReflexAgent
from app.infra.cooldown import InMemoryCooldownStore
from app.infra.execution_log import InMemoryExecutionLog
from app.models.events import AgentResult, CartInactivePayload, Event
from app.services.protocols import (
    AuditServiceProtocol,
    CartServiceProtocol,
    ConsentServiceProtocol,
    CrmServiceProtocol,
    EmailServiceProtocol,
)

logger = logging.getLogger(__name__)

_AGENT_NAME = "CartAbandonmentAgent"
_COOLDOWN_KEY = "cart_abandonment"


class CartAbandonmentReflexAgent(BaseReflexAgent):
    """Handles CART_INACTIVE_24H events.

    Rules (evaluated in order, short-circuit on first failure):
    1. Payload valid
    2. Cart not already purchased
    3. Customer has marketing consent
    4. Reminder not already sent (cooldown)
    5. Send reminder + update CRM + set cooldown + audit
    """

    def __init__(
        self,
        cart_service: CartServiceProtocol,
        consent_service: ConsentServiceProtocol,
        email_service: EmailServiceProtocol,
        crm_service: CrmServiceProtocol,
        audit_service: AuditServiceProtocol,
        cooldown_store: InMemoryCooldownStore,
        execution_log: InMemoryExecutionLog,
    ) -> None:
        self._cart = cart_service
        self._consent = consent_service
        self._email = email_service
        self._crm = crm_service
        self._audit = audit_service
        self._cooldown = cooldown_store
        self._log = execution_log

    def run(self, event: Event) -> AgentResult:
        event_id = str(event.event_id)
        processed_at = datetime.now(timezone.utc)

        try:
            payload = CartInactivePayload.model_validate(event.payload)
        except ValidationError as exc:
            return AgentResult(
                event_id=event.event_id,
                status="error",
                outcome=f"Payload non valido: {exc.error_count()} errore/i",
                actions_taken=[],
                processed_at=processed_at,
            )

        try:
            if self._cart.is_purchased(payload.cart_id):
                self._audit.record(event_id, _AGENT_NAME, "skipped", "already_purchased")
                return self._skipped(event, "Carrello già convertito in ordine", processed_at)

            if not self._consent.has_marketing_consent(payload.customer_id):
                self._audit.record(event_id, _AGENT_NAME, "skipped", "no_consent")
                return self._skipped(event, "Nessun consenso marketing per questo cliente", processed_at)

            if self._cooldown.is_in_cooldown(_COOLDOWN_KEY, payload.cart_id):
                self._audit.record(event_id, _AGENT_NAME, "skipped", "reminder_already_sent")
                return self._skipped(event, "Reminder già inviato per questo carrello", processed_at)

            email = self._cart.get_customer_email(payload.customer_id) or f"stub_{payload.customer_id}@example.com"
            self._email.send_cart_reminder(email, payload.cart_id, payload.cart_value)
            self._crm.update_campaign_state(payload.customer_id, payload.cart_id, "reminder_sent")
            self._cooldown.set_cooldown(_COOLDOWN_KEY, payload.cart_id)
            self._audit.record(event_id, _AGENT_NAME, "cart_reminder_sent")

            return AgentResult(
                event_id=event.event_id,
                status="success",
                outcome="Reminder carrello inviato con successo",
                actions_taken=["cart_reminder_email_sent", "crm_updated", "cooldown_set"],
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
