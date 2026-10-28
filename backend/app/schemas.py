from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=256)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TargetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    type: Literal["host", "image"]
    value: str = Field(min_length=1, max_length=512)


class TargetRead(BaseModel):
    id: int
    name: str
    type: str
    value: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ScanCreate(BaseModel):
    target_id: int
    tool: Literal["trivy", "nmap"]


class ScanRead(BaseModel):
    id: int
    target_id: int
    tool: str
    status: str
    error: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    model_config = ConfigDict(from_attributes=True)


class FindingRead(BaseModel):
    id: int
    scan_id: int
    tool: str
    asset: str
    title: str
    cve_id: str | None
    severity: str
    fixed_version: str | None
    description: str | None
    raw: dict[str, Any]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
