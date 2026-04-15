from fastapi import APIRouter, Depends, Query

from app.dependencies import get_execution_log
from app.infra.execution_log import ExecutionRecord, InMemoryExecutionLog

router = APIRouter(tags=["executions"])


@router.get("/api/executions")
def list_executions(
    limit: int = Query(default=20, ge=1, le=100),
    execution_log: InMemoryExecutionLog = Depends(get_execution_log),
) -> list[ExecutionRecord]:
    records = execution_log.get_all()
    return records[-limit:]
