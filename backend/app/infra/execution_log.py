from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field


@dataclass
class ExecutionRecord:
    event_id: str
    event_type: str
    agent: str
    status: str
    outcome: str
    actions_taken: list[str]
    logs: list[str]
    processed_at: str


class InMemoryExecutionLog:
    """Ring buffer of recent agent executions, observable via GET /api/executions."""

    def __init__(self, max_size: int = 100) -> None:
        self._records: deque[ExecutionRecord] = deque(maxlen=max_size)
        self._pending_logs: list[str] = []

    def add_log(self, message: str) -> None:
        """Accumulate a log line for the current execution (called by stub services)."""
        self._pending_logs.append(message)

    def append(self, record: ExecutionRecord) -> None:
        record.logs = list(self._pending_logs)
        self._pending_logs.clear()
        self._records.append(record)

    def get_all(self) -> list[ExecutionRecord]:
        return list(self._records)

    def clear(self) -> None:
        """For testing only."""
        self._records.clear()
        self._pending_logs.clear()
