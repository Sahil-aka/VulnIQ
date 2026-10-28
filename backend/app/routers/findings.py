from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, select
from sqlalchemy.orm import Session

from app.auth import require_user
from app.db import get_db
from app.models import Finding
from app.schemas import FindingRead

router = APIRouter(prefix="/api/v1/findings", tags=["findings"], dependencies=[Depends(require_user)])
_severity_rank = case(
    (Finding.severity == "CRITICAL", 0),
    (Finding.severity == "HIGH", 1),
    (Finding.severity == "MEDIUM", 2),
    (Finding.severity == "LOW", 3),
    else_=4,
)


@router.get("", response_model=list[FindingRead])
def list_findings(
    severity: str | None = Query(default=None, pattern="^(CRITICAL|HIGH|MEDIUM|LOW|INFO)$"),
    tool: str | None = Query(default=None, pattern="^(trivy|nmap)$"),
    scan_id: int | None = Query(default=None, ge=1),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Finding]:
    query = select(Finding)
    if severity:
        query = query.where(Finding.severity == severity)
    if tool:
        query = query.where(Finding.tool == tool)
    if scan_id:
        query = query.where(Finding.scan_id == scan_id)
    query = query.order_by(_severity_rank, Finding.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    return list(db.scalars(query))
