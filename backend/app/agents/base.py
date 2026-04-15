from abc import ABC, abstractmethod

from app.models.events import AgentResult, Event


class BaseReflexAgent(ABC):
    """Abstract base for all reflex agents.

    Each concrete agent implements deterministic condition-action rules.
    Agents are stateless: all state lives in injected services.
    """

    @abstractmethod
    def run(self, event: Event) -> AgentResult:
        """Execute the agent's rules for the given event.

        Must never raise — all exceptions are caught and returned as AgentResult(status='error').
        """
        ...
