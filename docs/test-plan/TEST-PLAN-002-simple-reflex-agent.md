# TEST-PLAN-002 — Simple Reflex Agent: Scenario Dialog + Backend

**Version:** 1.0  
**Date:** 2026-04-15  
**Traceability:** ADR-004 → ADR-005 → ADR-006 → questo piano → test files  

---

## Scope

Copertura completa della feature "Scenario Dialog + FastAPI Backend" che include:
- Frontend: `ScenarioDialog.jsx`, modifiche a `Dashboard.jsx`, estensione `agents.js`
- Backend: `CredentialRecoveryReflexAgent`, `CartAbandonmentReflexAgent`, `AgentOrchestrator`, API routes

---

## Test Layers

| Layer | Tool | Dove |
|-------|------|------|
| Unit (backend) | pytest + MagicMock | `backend/tests/unit/` |
| Integration (backend) | pytest + FastAPI TestClient | `backend/tests/integration/` |
| Unit (frontend) | Vitest + React Testing Library | `frontend/src/__tests__/` |

---

## Backend Unit Tests

### CredentialRecoveryReflexAgent (`test_credential_recovery_agent.py`)

| ID | Scenario | Input | Expected |
|----|----------|-------|----------|
| U-CR-01 | Happy path | user esiste, no cooldown, email valida | `status=success`, `actions_taken` include `reset_email_sent` |
| U-CR-02 | Utente non trovato | `user_exists=False` | `status=skipped`, outcome contiene "non trovato" |
| U-CR-03 | Account bloccato | `is_account_locked=True` | `status=skipped`, outcome contiene "bloccato" |
| U-CR-04 | Cooldown attivo | cooldown impostato su user | `status=skipped`, outcome contiene "cooldown" |
| U-CR-05 | Email service fallisce | `send_reset_email` lancia eccezione | `status=error`, nessuna eccezione propagata |
| U-CR-06 | Email payload non valida | `email="not-an-email"` | `status=error`, outcome contiene "non valido" |
| U-CR-07 | Campo obbligatorio mancante | payload senza `user_id` | `status=error` |
| U-CR-08 | Cooldown impostato dopo successo | happy path | `cooldown_store.is_in_cooldown(...)=True` |
| U-CR-09 | Audit chiamato su successo | happy path | `audit.record` chiamato almeno una volta |
| U-CR-10 | Audit chiamato su errore | email service fallisce | `audit.record` chiamato anche in caso di errore |

### CartAbandonmentReflexAgent (`test_cart_abandonment_agent.py`)

| ID | Scenario | Input | Expected |
|----|----------|-------|----------|
| U-CA-01 | Happy path | carrello attivo, consenso, no cooldown | `status=success`, `actions_taken` include `cart_reminder_email_sent` |
| U-CA-02 | Carrello convertito | `is_purchased=True` | `status=skipped`, outcome contiene "convertito" |
| U-CA-03 | Nessun consenso marketing | `has_marketing_consent=False` | `status=skipped`, outcome contiene "consenso" |
| U-CA-04 | Reminder già inviato | cooldown impostato su cart_id | `status=skipped`, outcome contiene "già inviato" |
| U-CA-05 | Email service fallisce | `send_cart_reminder` lancia eccezione | `status=error`, nessuna propagazione |
| U-CA-06 | cart_value = 0 | `cart_value=0` | `status=error` (validazione Pydantic `gt=0`) |
| U-CA-07 | cart_value negativo | `cart_value=-10` | `status=error` |
| U-CA-08 | CRM aggiornato su successo | happy path | `crm.update_campaign_state` chiamato una volta |
| U-CA-09 | CRM non chiamato su skip | `is_purchased=True` | `crm.update_campaign_state` non chiamato |

### AgentOrchestrator (`test_orchestrator.py`)

| ID | Scenario | Expected |
|----|----------|----------|
| U-OR-01 | Routing corretto | evento `PASSWORD_RESET_REQUESTED` → `credential_recovery` agent chiamato |
| U-OR-02 | Idempotenza: secondo invio | `agent.run` chiamato solo una volta, secondo invio usa cache |
| U-OR-03 | Tipo evento sconosciuto | `UnknownEventTypeError` sollevato |
| U-OR-04 | Risultato salvato su successo | `idempotency_store.has_been_processed=True` dopo process() |
| U-OR-05 | Risultato di errore salvato | anche con `status=error`, il risultato è in cache |
| U-OR-06 | Execution log aggiornato | `execution_log.get_all()` cresce di 1 dopo process() |

---

## Backend Integration Tests (`test_events_api.py`, `test_health_api.py`)

| ID | Endpoint | Scenario | HTTP Status | Verifica |
|----|----------|----------|-------------|---------|
| I-EV-01 | POST /api/events | Evento PASSWORD_RESET valido | 202 | body ha `event_id`, `status`, `outcome` |
| I-EV-02 | POST /api/events | Stesso event_id due volte | 409 | secondo invio restituisce 409 con body |
| I-EV-03 | POST /api/events | event_type sconosciuto | 422 | detail menziona event_type |
| I-EV-04 | POST /api/events | event_id mancante | 422 | errore Pydantic |
| I-EV-05 | POST /api/events | JSON malformato | 422 | FastAPI 422 default |
| I-EV-06 | POST /api/events | Evento CART_INACTIVE_24H valido | 202 | status in (success, skipped, error) |
| I-EV-07 | GET /api/executions | Dopo una POST | 200 | lista cresce di 1 |
| I-EV-08 | GET /api/health | — | 200 | `{"status":"ok"}` |
| I-EV-09 | GET /api/events/{id}/status | Dopo POST valida | 200 | risultato corrisponde a POST response |
| I-EV-10 | GET /api/events/{id}/status | UUID sconosciuto | 404 | — |

---

## Frontend Unit Tests

### `agents.js` (inclusi in `ScenarioDialog.test.jsx`)

| ID | Scenario | Expected |
|----|----------|----------|
| U-SD-10 | Tutti i 7 agenti hanno il campo `scenarios` | `scenarios` è un array |
| U-SD-11 | `simple-reflex` ha 2 scenari | `scenarios.length === 2` |
| U-SD-12 | Gli altri 6 agenti hanno `scenarios` vuoto | tutti con `length === 0` |

### `ScenarioDialog.jsx` (`ScenarioDialog.test.jsx`)

| ID | Scenario | Expected |
|----|----------|----------|
| U-SD-01 | Render con agente simple-reflex | Due card scenario visibili |
| U-SD-02 | Click su "Password Reset" | Campi `email` e `ID Utente` visibili |
| U-SD-03 | Click su "Carrello Abbandonato" | Campi `customer_id`, `cart_id`, `cart_value` visibili |
| U-SD-04 | Bottone Avvia con form vuoto | Bottone disabilitato |
| U-SD-05 | API call riuscita (mock fetch 202) | Panel risultato con outcome visibile |
| U-SD-06 | API restituisce 500 | Messaggio errore in italiano |
| U-SD-07 | API restituisce 409 | "Evento già elaborato" visibile |
| U-SD-08 | Agente senza scenari | "Nessuno scenario configurato" visibile |
| U-SD-09 | Chiudi e riapri dialog | Stato resettato (step = select) |

### `Dashboard.jsx` (aggiornamenti `Dashboard.test.jsx`)

| ID | Scenario | Expected (aggiornato) |
|----|----------|----------------------|
| U-D-05 | Click card simple-reflex | Dialog aperto (`role="dialog"` presente) |
| U-D-06 | Click card qualsiasi | Dialog aperto (non Snackbar diretto) |

---

## Security Test Checklist

- [ ] `user_id` con caratteri speciali (`../`, `<script>`) → 422
- [ ] `cart_value=0` → 422  
- [ ] `email` non valida → 422
- [ ] Stesso `event_id` due volte → 409 (idempotency)
- [ ] JSON con campi extra nel payload → 422 (`extra='forbid'`)
- [ ] `event_id` non UUID nel path param `/status` → 422
- [ ] Stack trace non esposto in risposta 500

---

## Definition of Done per questa feature

- [ ] Tutti i test backend passano: `pytest tests/ -v`
- [ ] Ruff pulito: `ruff check app/`
- [ ] Tutti i test frontend passano: `npm run test:run`
- [ ] `docker compose up -d --build` → 3 container healthy
- [ ] `curl POST /api/events` → 202 con AgentResult
- [ ] `GET /api/executions` → mostra log degli stub
- [ ] Dialog scenario funziona su http://localhost:8080
- [ ] ADR-004, ADR-005, ADR-006 scritti e approvati
