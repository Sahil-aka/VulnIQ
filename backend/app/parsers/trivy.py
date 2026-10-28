import json
from pathlib import Path
from typing import Any


_SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"}


def _severity(value: str | None) -> str:
    normalized = (value or "").upper()
    return normalized if normalized in _SEVERITIES else "INFO"


def parse_trivy(path: str | Path) -> list[dict[str, Any]]:
    """Convert Trivy JSON into the platform's normalized finding shape."""
    with Path(path).open(encoding="utf-8") as stream:
        document = json.load(stream)

    findings: list[dict[str, Any]] = []
    for result in document.get("Results") or []:
        if not isinstance(result, dict):
            continue
        for vuln in result.get("Vulnerabilities") or []:
            if not isinstance(vuln, dict):
                continue
            package = str(vuln.get("PkgName") or result.get("Target") or "Unknown package")
            installed = vuln.get("InstalledVersion")
            findings.append({
                "tool": "trivy",
                "asset": f"{package} {installed}".strip(),
                "title": str(vuln.get("Title") or vuln.get("VulnerabilityID") or "Vulnerability"),
                "cve_id": vuln.get("VulnerabilityID") or None,
                "severity": _severity(vuln.get("Severity")),
                "fixed_version": vuln.get("FixedVersion") or None,
                "description": vuln.get("Description") or None,
                "raw": {"result": result, "vulnerability": vuln},
            })
    return findings
