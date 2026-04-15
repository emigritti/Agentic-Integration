# ADR-004 — Backend Framework: FastAPI + Uvicorn

**Status:** Accepted  
**Date:** 2026-04-15  
**Deciders:** Development team  
**Traceability:** → TEST-PLAN-002 → backend/tests/

---

## Context

Il progetto richiede un backend Python per ricevere eventi dal frontend React, eseguire la logica degli agenti reflex e restituire i risultati. Il framework deve integrarsi con Pydantic v2 (già usato per la modellazione degli eventi), supportare OpenAPI auto-generato, ed essere compatibile con Docker/WSL.

---

## Decision

Adottare **FastAPI 0.111** con **Uvicorn** come ASGI server.

---

## Alternatives Considered

| Framework | Pro | Contro | Motivo esclusione |
|-----------|-----|--------|-------------------|
| **FastAPI** ✅ | Pydantic v2 nativo, OpenAPI auto, async, lightweight | Relativamente recente | — |
| Flask | Maturo, semplice | No async, no validazione automatica, no OpenAPI | Richiederebbe marshmallow/flask-pydantic aggiuntivi |
| Django REST Framework | Maturo, admin UI | ORM obbligatorio, overhead elevato, non allineato con l'architettura event-driven | Troppo opinionated per questo caso d'uso |
| Starlette (bare) | Ultra-lightweight | Nessun auto-docs, molto boilerplate | FastAPI è Starlette + valore aggiunto senza costi |

---

## Consequences

**Positive:**
- Validazione automatica dei payload via Pydantic — allineata con i modelli `Event`, `AgentResult`
- OpenAPI disponibile su `/docs` senza configurazione aggiuntiva
- Dependency injection nativa tramite `Depends()` — chiave per la stub strategy
- Tipo di ritorno dichiarato → errori di schema rilevati a compile-time

**Negative / Risks:**
- Nessuna autenticazione sul `/api/events` endpoint in dev scope — **gap noto e accettato**, documentato qui
- In-memory state (idempotency, cooldown, execution_log) non persistente al riavvio del container

---

## Known Gap: Autenticazione

`POST /api/events` è esposto senza autenticazione. Accettabile in questa fase perché:
- Accesso solo tramite nginx proxy su rete Docker interna
- Nessun dato reale (soli dati sintetici)
- L'aggiunta di API key / OAuth2 è una modifica isolata a `dependencies.py`

**Rollback:** Se FastAPI risultasse inadeguato, la sostituzione è circoscritta a `main.py`, `api/routes/`, `dependencies.py` — agents e services non cambiano.

---

## Validation Plan

- `GET /api/health` → 200 `{"status":"ok"}`
- `POST /api/events` con payload valido → 202 con AgentResult
- `ruff check app/` → zero errori
- `pytest tests/ -v` → tutti i test passano
