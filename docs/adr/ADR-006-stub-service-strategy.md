# ADR-006 — Strategia servizi stub per lo sviluppo

**Status:** Accepted  
**Date:** 2026-04-15  
**Deciders:** Development team  
**Traceability:** → ADR-004 → ADR-005 → TEST-PLAN-002

---

## Context

Gli agenti reflex dipendono da servizi esterni (Email, Identity/CRM, Token, Cart, Consent, Audit). In ambiente di sviluppo questi servizi non esistono. Serve una strategia per rendere il sistema eseguibile e testabile senza dipendenze reali, mantenendo la possibilità di sostituire le implementazioni senza modificare gli agenti.

---

## Decision

Usare **Python `typing.Protocol`** per definire le interfacce dei servizi e fornire **implementazioni stub in-process** selezionate tramite variabile d'ambiente `USE_STUB_SERVICES=true`.

Il punto di wiring è esclusivamente `backend/app/dependencies.py` — nessun agente o servizio conosce l'esistenza degli stub.

---

## Stub Behavior

| Servizio | Comportamento stub |
|----------|--------------------|
| `StubEmailService` | Log `[EMAIL STUB] ...` su stdout + in-memory execution_log |
| `StubIdentityService` | Ogni `user_id` valido (regex) esiste, nessun account bloccato |
| `StubTokenService` | `secrets.token_urlsafe(32)` — entropia reale, sicuro |
| `StubCartService` | Nessun carrello convertito, email stub |
| `StubConsentService` | Consenso sempre presente |
| `StubCrmService` | Log `[CRM STUB] ...` + execution_log |
| `StubAuditService` | Log `[AUDIT] ...` — nessun PII, solo event_id + outcome |

Tutti i log stub sono visibili via `GET /api/executions` (in-memory ring buffer).

---

## Alternatives Considered

| Approccio | Pro | Contro | Motivo esclusione |
|-----------|-----|--------|-------------------|
| **Protocol + stub in-process** ✅ | Zero infra, test veloci, swap isolato in dependencies.py | Stato non persistente | — |
| Mock server separato (WireMock/mockoon) | Realistico, condivisibile | Container aggiuntivo, configurazione YAML, latency network | Overhead eccessivo per dev phase |
| Monkey-patching nei test | Semplice per test | Fragile, dipende dall'import order, non funziona in integration | Rompe isolamento |
| Feature flags per servizio | Granulare | Scattered in tutto il codebase | Viola il principio di single responsibility |

---

## Compliance Note (Accenture Data Boundary)

I dati sintetici usati negli stub (`stub_{user_id}@example.com`, `cart-001`) rispettano il confine dati definito in `CLAUDE.md`:
- Nessun dato cliente reale
- Nessun PII
- Solo dati interni generati artificialmente

---

## Observability

L'endpoint `GET /api/executions` espone il ring buffer degli ultimi N eventi elaborati (default 100), includendo i log prodotti dagli stub. Questo permette alla dashboard React di consultare lo storico delle esecuzioni senza accesso diretto ai log del container.

---

## Rollback / Sostituzione

Per sostituire uno stub con un'implementazione reale:
1. Creare `app/services/real_email_service.py` che implementa `EmailServiceProtocol`
2. In `app/dependencies.py`, sostituire `StubEmailService(...)` con `RealEmailService(...)`
3. Nessuna modifica agli agenti o all'orchestratore

---

## Validation Plan

- `USE_STUB_SERVICES=true` (default) → `docker compose up` funziona senza servizi esterni
- `GET /api/executions` → mostra log degli stub dopo una POST /api/events
- `pytest tests/unit/` → tutti i test usano MagicMock, nessuna dipendenza reale
