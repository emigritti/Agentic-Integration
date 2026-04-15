from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic import UUID4


class EventType(str, Enum):
    PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED"
    CART_INACTIVE_24H = "CART_INACTIVE_24H"


class PasswordResetPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$")
    email: EmailStr
    trigger_source: str = "dashboard"


class CartInactivePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    customer_id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$")
    cart_id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$")
    cart_value: float = Field(gt=0)
    last_activity_at: datetime | None = None


class Event(BaseModel):
    event_id: UUID4
    event_type: EventType
    timestamp: datetime
    source: str = Field(max_length=64)
    correlation_id: UUID4
    payload: dict


class AgentResult(BaseModel):
    event_id: UUID4
    status: Literal["success", "skipped", "error"]
    outcome: str
    actions_taken: list[str]
    processed_at: datetime
