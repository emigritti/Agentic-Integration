from pydantic import BaseModel


class AcceptedResponse(BaseModel):
    event_id: str
    status: str
    outcome: str
    actions_taken: list[str]
    processed_at: str


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
