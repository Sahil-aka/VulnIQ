import ipaddress
import re
import socket

from fastapi import HTTPException

_IMAGE_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9./:_-]{0,511}$")
_HOST_PATTERN = re.compile(r"^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$")


def validate_image_name(value: str) -> str:
    value = value.strip()
    if not _IMAGE_PATTERN.fullmatch(value) or ".." in value or ";" in value:
        raise HTTPException(status_code=422, detail="Image name contains unsupported characters")
    return value


def _allowed_ip(address: str) -> bool:
    ip = ipaddress.ip_address(address)
    return (ip.is_loopback or ip.is_private) and not (
        ip.is_multicast or ip.is_reserved or ip.is_unspecified
    )


def resolve_allowed_host(value: str) -> str:
    """Validate and return a private IP literal to pin for the scanner call."""
    value = value.strip().rstrip(".")
    try:
        direct = ipaddress.ip_address(value)
        if _allowed_ip(str(direct)):
            return str(direct)
        raise HTTPException(status_code=422, detail="Public IP addresses are not allowed")
    except ValueError:
        pass

    if not _HOST_PATTERN.fullmatch(value):
        raise HTTPException(status_code=422, detail="Enter localhost or a private lab hostname")
    try:
        resolved = {info[4][0] for info in socket.getaddrinfo(value, None, type=socket.SOCK_STREAM)}
        if not resolved or any(not _allowed_ip(address) for address in resolved):
            raise HTTPException(status_code=422, detail="Host must resolve only to private or localhost addresses")
        # Pin one already-validated address so the scanner does not resolve the name again.
        return sorted(resolved)[0]
    except socket.gaierror:
        raise HTTPException(status_code=422, detail="Host could not be resolved from the scanner container") from None
