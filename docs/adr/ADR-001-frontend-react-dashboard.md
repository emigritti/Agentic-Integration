# ADR-001: React Frontend Dashboard with Material UI

## Status
Accepted

## Date
2026-04-15

## Context
The Agentic-Integration platform needs a dashboard UI to trigger specialized commerce agents.
The project mandates React as the frontend framework and Docker for containerization.
A Material Design library is required for a consistent, accessible component system.

## Decision
- **Framework**: React 18 with Vite as build tool
- **UI Library**: MUI (Material UI) v5 — official Material Design implementation
- **State**: local React state (useState) — no external store needed at this stage
- **Containerization**: multi-stage Docker build (node:20-alpine → nginx:alpine)
- **Testing**: Vitest + React Testing Library

## Alternatives Considered
| Option | Pros | Cons | Why Rejected |
|--------|------|------|--------------|
| Create React App | familiar | deprecated, slow builds | replaced by Vite |
| Next.js | SSR, routing | overkill for client-only dashboard | unnecessary complexity |
| Chakra UI | accessible, ergonomic | not Material Design | violates project mandate |
| Tailwind CSS | flexible | not a component library, custom work | violates Material Design mandate |

## Trade-offs
- MUI bundle is larger than a custom CSS approach — acceptable given component richness and accessibility guarantees.
- Vite build artifacts are static files; no SSR. Acceptable for an internal dashboard.
- Single Docker image bundles both build and serve — CI simplicity over image layer separation.

## Validation Plan
- Unit tests (Vitest + RTL) verify component rendering and interaction behavior
- `docker build` must succeed with zero errors
- Manual browser smoke test confirms Material Design rendering and card interaction

## Rollback Strategy
Frontend is stateless. Roll back by deploying a previous Docker image tag via `docker compose up` with the prior image version.

## References
- [MUI v5 docs](https://mui.com/)
- [Vite docs](https://vitejs.dev/)
- CLAUDE.md — Tech Stack section
