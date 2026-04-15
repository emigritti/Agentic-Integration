# ADR-005 — Elaborazione eventi sincrona (no message bus)

**Status:** Accepted  
**Date:** 2026-04-15  
**Deciders:** Development team  
**Traceability:** → ADR-004 → TEST-PLAN-002

---

## Context

L'architettura target descritta in `simple-reflex-agent/architecture.md` prevede un event bus (Kafka / RabbitMQ / SQS) per il disaccoppiamento asincrono tra ingestion layer e agenti. Tuttavia, in questa fase di scaffold/dev, l'implementazione di un message broker introduce complessità infrastrutturale non giustificata.

---

## Decision

Elaborare gli eventi in modo **sincrono e request/response** all'interno del ciclo di vita della singola chiamata HTTP.

Flusso attuale:
```
Frontend → POST /api/events → AgentOrchestrator.process() → AgentResult → 202 Response
```

Il boundary per l'introduzione del message bus è **esclusivamente `AgentOrchestrator.process()`** — nessun agente o servizio conosce il meccanismo di dispatch.

---

## Alternatives Considered

| Approccio | Pro | Contro |
|-----------|-----|--------|
| **Sincrono** ✅ | Zero infra aggiuntiva, test deterministici, risultato immediato al frontend | Non scala orizzontalmente, singolo worker |
| Celery + Redis | Task queue matura, retry automatico | Redis container aggiuntivo, complessità test, latenza > 0 nel risultato |
| Kafka | Scalabilità enterprise, replay eventi | Kafka container pesante (JVM), overkill per 2 agenti in dev |
| asyncio in-process | Nessuna infra, semi-asincrono | Complexity senza beneficio reale a singolo worker |

---

## Consequences

**Positive:**
- Il frontend riceve il risultato dell'agente nella stessa response HTTP (UX immediata)
- I test di integrazione sono deterministici (no race condition, no timeout su queue)
- L'orchestrator è testabile in isolamento con MagicMock

**Negative / Risks:**
- Se un agente impiega >30s (timeout nginx), la request va in timeout
- Non scalabile a N worker paralleli senza coordinamento dell'in-memory state
- Nessun retry automatico in caso di failure

**Mitigazioni:**
- nginx `proxy_read_timeout 30s` — limite esplicito
- Agenti reflex sono deterministici e veloci (<100ms in stub mode) — timeout non è un rischio pratico
- In-memory stores sono singleton a livello di processo — un solo worker Uvicorn in dev

---

## Rollback / Evoluzione

Per introdurre un message bus: modificare solo `app/orchestrator/orchestrator.py` per pubblicare su una queue invece di chiamare `agent.run()` direttamente. L'API route, gli agenti, e i servizi non cambiano.

---

## Validation Plan

- Latency `POST /api/events` < 500ms in stub mode (verificabile con `curl -w "%{time_total}"`)
- Nessun timeout nei test di integrazione con `TestClient`
