# ADR-002: Nginx Reverse Proxy as Single Network Entry Point

## Status
Accepted

## Date
2026-04-15

## Context
Network policy requires all external traffic to enter the system through a single port (80).
Without a central entry point:
- each service exposes its own port (e.g. frontend on 3000, future backend on 8000), violating the policy
- adding TLS, rate limiting, or auth headers requires duplicating config across services
- service-to-service routing is uncontrolled

A reverse proxy sitting in front of all containers solves these problems: one external port, one place to manage routing rules, headers, and future cross-cutting concerns.

## Decision
Introduce a dedicated **nginx reverse proxy container** (`proxy/`) that:
- is the **only** service to expose a host port (`:80`)
- routes incoming requests to internal services by path prefix:
  - `/` → `frontend:80`
  - `/api/` → `backend:<port>` *(reserved, not yet implemented)*
- all other services are **internal-only** (no host port binding)
- services communicate over a dedicated Docker bridge network (`agentic-net`)

## Alternatives Considered
| Option | Pros | Cons | Why Rejected |
|--------|------|------|--------------|
| Traefik | auto-discovery, dashboard, Let's Encrypt | complex config, heavyweight for current stage | overkill for 2 services |
| HAProxy | high performance, TCP + HTTP | less familiar, less ecosystem | nginx already used for frontend |
| Cloud load balancer | managed, scalable | requires cloud infra, not Docker-native | out of scope for local/WSL dev |
| Expose each service directly | simple | violates network policy, no central control | rejected by constraint |

## Trade-offs
- **Gain:** single external port, central point for routing, headers, future TLS termination, and rate limiting.
- **Gain:** internal services are not reachable from the host — reduced attack surface.
- **Cost:** one extra container and config file to maintain.
- **Cost:** all traffic routes through nginx — adds one network hop (negligible latency at this scale).

## Validation Plan
- `docker compose up --build` succeeds with no errors
- `curl http://localhost/` returns the React dashboard (HTTP 200)
- Frontend container has **no** host port binding — `docker ps` shows no `0.0.0.0:3000` mapping
- Reserved `/api/` path returns 502 (backend not yet running) — confirms routing is wired
- Future: backend container added with no config change to proxy required beyond the upstream block

## Rollback Strategy
Remove the `proxy/` service from `docker-compose.yml`, re-add `ports: - "3000:80"` to the frontend service, and delete `proxy/`. No data is stored in the proxy container.

## References
- [nginx reverse proxy docs](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- ADR-001 — Frontend Docker setup
- CLAUDE.md — Tech Stack / Commands
