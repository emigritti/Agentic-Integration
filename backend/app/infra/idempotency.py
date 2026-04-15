from __future__ import annotations

from datetime import datetime, timezone

from app.models.events import AgentResult


class InMemoryIdempotencyStore:
    """Thread-safe for single-worker Uvicorn. Use an external store for multi-worker."""

    def __init__(self, ttl_seconds: int = 86400) -> None:
        self._ttl = ttl_seconds
        self._store: dict[str, tuple[AgentResult, datetime]] = {}

    def has_been_processed(self, event_id: str) -> bool:
        entry = self._store.get(event_id)
        if entry is None:
            return False
        _, stored_at = entry
        age = (datetime.now(timezone.utc) - stored_at).total_seconds()
        if age > self._ttl:
            del self._store[event_id]
            return False
        return True

    def mark_processed(self, event_id: str, result: AgentResult) -> None:
        self._store[event_id] = (result, datetime.now(timezone.utc))

    def get_result(self, event_id: str) -> AgentResult | None:
        if not self.has_been_processed(event_id):
            return None
        return self._store[event_id][0]
