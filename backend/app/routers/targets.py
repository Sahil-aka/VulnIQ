from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_user
from app.db import get_db
from app.models import Target
from app.schemas import TargetCreate, TargetRead
from app.services.validators import resolve_allowed_host, validate_image_name

router = APIRouter(prefix="/api/v1/targets", tags=["targets"], dependencies=[Depends(require_user)])


@router.get("", response_model=list[TargetRead])
def list_targets(db: Session = Depends(get_db)) -> list[Target]:
    return list(db.scalars(select(Target).order_by(Target.created_at.desc())))


@router.post("", response_model=TargetRead, status_code=status.HTTP_201_CREATED)
def create_target(body: TargetCreate, db: Session = Depends(get_db)) -> Target:
    value = body.value.strip()
    if body.type == "host":
        resolve_allowed_host(value)
    else:
        value = validate_image_name(value)
    target = Target(name=body.name.strip(), type=body.type, value=value)
    db.add(target)
    db.commit()
    db.refresh(target)
    return target


@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_target(target_id: int, db: Session = Depends(get_db)) -> Response:
    target = db.get(Target, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")
    db.delete(target)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
