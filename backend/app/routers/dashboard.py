from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import require_user
from app.db import get_db
from app.models import Finding, Scan
from app.schemas import ScanRead

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"], dependencies=[Depends(require_user)])


@router.get("/summary")
def summary(db: Session = Depends(get_db)) -> dict:
    severity_rows = db.execute(select(Finding.severity, func.count(Finding.id)).group_by(Finding.severity)).all()
    tool_rows = db.execute(select(Finding.tool, func.count(Finding.id)).group_by(Finding.tool)).all()
    severities = {name: 0 for name in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO")}
    severities.update({name: count for name, count in severity_rows})
    tools = {"trivy": 0, "nmap": 0}
    tools.update({name: count for name, count in tool_rows})
    total = sum(severities.values())
    recent = list(db.scalars(select(Scan).order_by(Scan.created_at.desc()).limit(5)))
    return {"total_findings": total, "by_severity": severities, "by_tool": tools, "last_scans": [ScanRead.model_validate(x).model_dump(mode="json") for x in recent]}
