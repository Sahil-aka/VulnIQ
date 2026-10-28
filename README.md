# VulnIQ - Vulnerability Detection Platform

Demo platform that runs Trivy image scans and Nmap lab scans, then presents normalized findings in one place.

## Start locally

1. Install Docker Desktop and Git.
2. Copy `.env.example` to `.env` and replace the local secrets.
3. Run `docker compose up --build`.
4. Open the UI at <http://localhost:5173> and API docs at <http://localhost:18080/docs>.
5. Start the optional lab target with `docker compose --profile lab up -d juice-shop`.

Only scan systems you own or are authorized to test. The scanner implementation must reject public targets.

## Project layout

- `backend/` - FastAPI API, persistence, scanner runners, and parsers.
- `frontend/` - React/Vite user interface.
- `docs/` - product brief and architecture notes.

## API starter

The API reads `ADMIN_USER`, `ADMIN_PASSWORD`, and `JWT_SECRET` from the environment. Log in with `POST /api/v1/auth/login` using JSON `{ "username": "...", "password": "..." }`; the UI keeps the returned token in memory and sends it as `Authorization: Bearer <token>` on protected API routes. API details are available in `/docs`.

- `GET /api/v1/health` - health check, no token required.
- `GET/POST/DELETE /api/v1/targets` - manage image and private lab host targets.
- `POST/GET /api/v1/scans`, `GET /api/v1/scans/{id}` - start scans and read their status.
- `GET /api/v1/findings` - page and filter by severity, tool, or scan ID.
- `GET /api/v1/dashboard/summary` - severity/tool counts and the five latest scans.

Scans run through FastAPI background tasks in the API process for the demo. They use subprocess argument arrays with timeouts. Hostnames must resolve to private or loopback addresses; Nmap receives a resolved IP to avoid re-resolving the hostname during the scan. Use a worker queue for durable scan execution in a later phase.

Trivy database mirrors are configurable with TRIVY_DB_REPOSITORIES; the default tries Docker Hub, then Public ECR and GitHub Container Registry.

If the scanner container cannot resolve registry hosts, set BACKEND_DNS_1 and BACKEND_DNS_2 in .env to DNS servers reachable on your network.


