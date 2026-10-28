from datetime import datetime, timedelta, timezone
import hmac

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError

from app.config import settings

_bearer = HTTPBearer(auto_error=False)


def authenticate(username: str, password: str) -> bool:
    return hmac.compare_digest(username, settings.admin_user) and hmac.compare_digest(
        password, settings.admin_password
    )


def issue_token(username: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": username, "iat": now, "exp": now + timedelta(hours=8)},
        settings.jwt_secret,
        algorithm="HS256",
    )


def require_user(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> str:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Valid bearer token required",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"])
        username = payload.get("sub")
        if isinstance(username, str) and username:
            return username
    except InvalidTokenError:
        pass
    raise unauthorized
