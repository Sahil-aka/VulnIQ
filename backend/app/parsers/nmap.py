from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET


def parse_nmap(path: str | Path) -> list[dict[str, Any]]:
    """Convert Nmap XML open ports into normalized informational findings."""
    root = ET.parse(path).getroot()
    findings: list[dict[str, Any]] = []
    for host in root.findall("host"):
        address = next((node.get("addr") for node in host.findall("address") if node.get("addr")), "unknown")
        for port in host.findall("./ports/port"):
            if port.find("state") is None or port.find("state").get("state") != "open":
                continue
            service = port.find("service")
            service_name = service.get("name", "unknown") if service is not None else "unknown"
            product = service.get("product", "") if service is not None else ""
            version = service.get("version", "") if service is not None else ""
            detail = " ".join(part for part in (product, version) if part)
            banner = f" ({detail})" if detail else ""
            protocol = port.get("protocol", "tcp")
            port_id = port.get("portid", "unknown")
            findings.append({
                "tool": "nmap",
                "asset": f"{address}:{port_id}/{protocol}",
                "title": f"Open port: {service_name}{banner}",
                "cve_id": None,
                "severity": "INFO",
                "fixed_version": None,
                "description": f"Nmap detected open {protocol} port {port_id} running {service_name}.",
                "raw": {"address": address, "port": ET.tostring(port, encoding="unicode")},
            })
    return findings
