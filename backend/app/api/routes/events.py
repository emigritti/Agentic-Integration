from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Response

from app.dependencies import get_idempotency_store, get_orchestrator
from app.infra.idempotency import InMemoryIdempotencyStore
from app.models.events import AgentResult, Event
from app.models.responses import AcceptedResponse
from app.orchestrator.orchestrator import AgentOrchestrator, UnknownEventTypeError

logger = logging.getLogger(__name__)
router = APIRouter(tags=["events"])


@router.post("/api/events", status_code=202)
def post_event(
    event: Event,
    orchestrator: AgentOrchestrator = Depends(get_orchestrator),
    idempotency_store: InMemoryIdempotencyStore = Depends(get_idempotency_store),
) -> Response:
    was_cached = idempotency_store.has_been_processed(str(event.event_id))

    try:
        result = orchestrator.process(event)
    except UnknownEventTypeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        logger.exception("Unexpected error processing event %s", event.event_id)
        raise HTTPException(status_code=500, detail="Errore interno durante l'elaborazione")

    status_code = 409 if was_cached else 202
    accepted = AcceptedResponse(
        event_id=str(result.event_id),
        status=result.status,
        outcome=result.outcome,
        actions_taken=result.actions_taken,
        processed_at=result.processed_at.isoformat(),
    )
    return Response(
        content=accepted.model_dump_json(),
        status_code=status_code,
        media_type="application/json",
    )


@router.get("/api/events/{event_id}/status")
def get_event_status(
    event_id: str,
    idempotency_store: InMemoryIdempotencyStore = Depends(get_idempotency_store),
) -> AgentResult:
    try:
        from uuid import UUID
        UUID(event_id)  # validate format to prevent injection
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid event_id format")

    result = idempotency_store.get_result(event_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Event not found or expired")
    return result
