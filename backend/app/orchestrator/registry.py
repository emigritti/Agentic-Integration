from app.models.events import EventType

# Maps EventType to the agent_name key used in AgentOrchestrator.agent_map
AGENT_REGISTRY: dict[EventType, str] = {
    EventType.PASSWORD_RESET_REQUESTED: "credential_recovery",
    EventType.CART_INACTIVE_24H: "cart_abandonment",
}
