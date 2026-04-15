from __future__ import annotations

from datetime import datetime, timedelta, timezone


class InMemoryCooldownStore:
    """Prevents repeated agent actions within a configurable TTL window."""

    def __init__(self, ttl_seconds: int = 300) -> None:
        self._ttl = ttl_seconds
        self._store: dict[str, datetime] = {}

    def _key(self, agent_type: str, entity_id: str) -> str:
        return f"{agent_type}:{entity_id}"

    def is_in_cooldown(self, agent_type: str, entity_id: str) -> bool:
        key = self._key(agent_type, entity_id)
        expires_at = self._store.get(key)
        if expires_at is None:
            return False
        if datetime.now(timezone.utc) >= expires_at:
            del self._store[key]
            return False
        return True

    def set_cooldown(self, agent_type: str, entity_id: str) -> None:
        key = self._key(agent_type, entity_id)
        self._store[key] = datetime.now(timezone.utc) + timedelta(seconds=self._ttl)

    def clear(self) -> None:
        """For testing only."""
        self._store.clear()
