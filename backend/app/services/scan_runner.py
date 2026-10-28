from datetime import datetime, timezone
from pathlib import Path
import subprocess

from app.config import settings
from app.db import SessionLocal
from app.models import Finding, Scan, Target
from app.parsers.nmap import parse_nmap
from app.parsers.trivy import parse_trivy
from app.services.validators import resolve_allowed_host, validate_image_name


def run_scan(scan_id: int) -> None:
    """Execute one scanner in-process and persist the normalized result."""
    with SessionLocal() as db:
        scan = db.get(Scan, scan_id)
        if scan is None:
            return
        target = db.get(Target, scan.target_id)
        scan.status = "running"
        scan.started_at = datetime.now(timezone.utc)
        db.commit()

        try:
            if target is None:
                raise RuntimeError("The scan target no longer exists")

            output_dir = Path(settings.scan_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
            suffix = ".json" if scan.tool == "trivy" else ".xml"
            output_path = output_dir / f"{scan.id}{suffix}"
            if scan.tool == "trivy":
                image = validate_image_name(target.value)
                database_repositories = [
                    repository.strip()
                    for repository in settings.trivy_db_repositories.split(",")
                    if repository.strip()
                ]
                database_flags = [
                    flag
                    for repository in database_repositories
                    for flag in ("--db-repository", repository)
                ]
                command = [
                    "trivy", "image", *database_flags, "--format", "json", "--quiet",
                    "--output", str(output_path), image,
                ]
                timeout = settings.trivy_timeout
                parser = parse_trivy
            else:
                host = resolve_allowed_host(target.value)
                command = ["nmap", "-sV", "-oX", str(output_path), host]
                timeout = settings.nmap_timeout
                parser = parse_nmap

            completed = subprocess.run(command, capture_output=True, text=True, timeout=timeout, check=False)
            if completed.returncode != 0:
                reason = (completed.stderr or completed.stdout or "Scanner returned an error").strip()
                raise RuntimeError(reason[-1000:])
            if not output_path.is_file():
                raise RuntimeError("Scanner finished without producing a report")

            scan.raw_output_path = str(output_path)
            parsed = parser(output_path)
            db.add_all([Finding(scan_id=scan.id, **item) for item in parsed])
            scan.status = "completed"
            scan.finished_at = datetime.now(timezone.utc)
            scan.error = None
            db.commit()
        except subprocess.TimeoutExpired:
            db.rollback()
            _mark_failed(db, scan_id, f"{scan.tool} scan exceeded its {timeout}-second timeout")
        except Exception as exc:
            db.rollback()
            message = str(exc).strip() or "Unexpected scanner error"
            _mark_failed(db, scan_id, message[-1000:])


def _mark_failed(db, scan_id: int, message: str) -> None:
    scan = db.get(Scan, scan_id)
    if scan is None:
        return
    scan.status = "failed"
    scan.error = message
    scan.finished_at = datetime.now(timezone.utc)
    db.commit()
