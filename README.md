# VulnIQ - Vulnerability Detection Platform

Demo platform that runs Trivy image scans and Nmap lab scans, then presents normalized findings in one place.

## Start locally

1. Install Docker Desktop and Git.
2. Copy `.env.example` to `.env` and replace the local secrets.
3. Run `docker compose up --build`.
4. Open the UI at <http://localhost:5173> and API docs at <http://localhost:8000/docs>.
5. Use `docker compose --profile lab up -d juice-shop` to start the optional lab target.

Only scan systems you own or are authorized to test. The scanner implementation must reject public targets.

## Project layout

- `backend/` - FastAPI API, persistence, scanner runners, and parsers.
- `frontend/` - React/Vite user interface.
- `docs/` - product brief and architecture notes.

The initial scaffold provides the services and health endpoints. Scanner execution, authentication, targets, and findings are the next implementation slices.
