from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_user
from app.db import get_db
from app.models import Scan, Target
from app.schemas import ScanCreate, ScanRead
from app.services.scan_runner import run_scan
from app.services.validators import resolve_allowed_host, validate_image_name

router = APIRouter(prefix="/api/v1/scans", tags=["scans"], dependencies=[Depends(require_user)])


@router.post("", response_model=ScanRead, status_code=status.HTTP_202_ACCEPTED)
def create_scan(body: ScanCreate, background: BackgroundTasks, db: Session = Depends(get_db)) -> Scan:
    target = db.get(Target, body.target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")
    expected_type = "image" if body.tool == "trivy" else "host"
    if target.type != expected_type:
        raise HTTPException(status_code=422, detail=f"{body.tool} scans require a {expected_type} target")
    if body.tool == "nmap":
        resolve_allowed_host(target.value)
    else:
        validate_image_name(target.value)
    scan = Scan(target_id=target.id, tool=body.tool, status="queued")
    db.add(scan)
    db.commit()
    db.refresh(scan)
    background.add_task(run_scan, scan.id)
    return scan


@router.get("", response_model=list[ScanRead])
def list_scans(
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[Scan]:
    return list(db.scalars(select(Scan).order_by(Scan.created_at.desc()).limit(limit)))


@router.get("/{scan_id}", response_model=ScanRead)
def get_scan(scan_id: int, db: Session = Depends(get_db)) -> Scan:
    scan = db.get(Scan, scan_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan
