# Simple reflex agent

due possibili scenari:

- password reset
- abandoned cart
 
## 1. Architettura a 3 livelli

### A. Event ingestion

trigger da dashboard per Password reset:

- click su bottone **“Password dimenticata”**
- email in ingresso con keyword tipo “password dimenticata”

trigger da dashboard per Abandoned Cart:

- carrello inattivo da 24 ore
- eventuali webhook da CRM, e-commerce, ticketing

**Componenti tipici**:

- API gateway / webhook receiver
- listener email
- scheduler o job che controlla timeout/inattività
- event bus o message broker

### B. Decision layer

Qui vive la logica “if-then”.

- **Simple Reflex Agent Engine**
- eventuale **Rule Engine**
- piccolo **Policy layer** per controlli di sicurezza, rate limit, idempotenza

Esempio:

- Evento: `PASSWORD_RESET_REQUESTED`
- Condizione: utente verificato + non in cooldown
- Azione: genera token + invia reset link

Oppure:

- Evento: `CART_INACTIVE_24H`
- Condizione: carrello non convertito + utente contattabile + nessuna mail già inviata
- Azione: invia reminder

### C. Action layer

Esegue davvero le azioni:

- invio email
- generazione link reset
- aggiornamento CRM
- apertura ticket
- log/audit
- notifiche interne

------

## 2. Selected architettura : event-driven + orchestrazione leggera

Evitiamo un orchestratore “LLM-centrico”. Farei invece una struttura così:

```text
[Channels / Systems]
  -> Web App
  -> Email Inbox
  -> E-commerce
  -> CRM

        |
        v

[Event Ingestion Layer]
  -> API/Webhook Receiver
  -> Email Parser
  -> Scheduler / Timeout Detector

        |
        v

[Event Bus / Queue]
  -> Kafka / RabbitMQ / SQS / PubSub

        |
        v

[Agent Orchestrator]
  -> Route event to correct agent
  -> Enforce policies
  -> Idempotency / retries
  -> Correlation IDs / logging

        |
        +--> [Simple Reflex Agent: Credential Recovery]
        |
        +--> [Simple Reflex Agent: Cart Abandonment]
        |
        +--> [Other Agents later]

                |
                v

[Action Services]
  -> Identity Service
  -> Email Service
  -> CRM Service
  -> Audit / Monitoring
```

------

## 3. Come dividerei “agente” e “orchestrazione”

### Agente

L’agente dovrebbe essere **molto piccolo e focalizzato**:

- riceve un evento normalizzato
- valuta regole locali
- decide un outcome
- restituisce un piano d’azione o chiama un action service

Per esempio:

#### Credential Recovery Agent

Input:

- `user_id`
- `email`
- `trigger_source` = web / email
- `timestamp`

Regole:

- se richiesta valida
- se utente esiste
- se non supera threshold anti-abuso
- se account non bloccato

Azioni:

- genera reset token
- invia email reset
- registra audit event

#### Cart Abandonment Agent

Input:

- `cart_id`
- `customer_id`
- `last_activity_at`
- `cart_value`
- `items`
- `consent_marketing`

Regole:

- se inattivo > 24h
- se ordine non completato
- se reminder non già inviato
- se consenso comunicazioni disponibile

Azioni:

- invia reminder
- opzionale coupon
- aggiorna stato campagna

Quindi: **agenti verticali per use case**, non un unico mega-agente.

### Orchestratore

L’orchestratore invece non decide il business in dettaglio. Fa soprattutto:

- routing dell’evento verso l’agente corretto
- gestione retry
- deduplica eventi
- timeout
- osservabilità
- fallback ed error handling
- audit trail

In pratica:

- l’agente decide **cosa fare**
- l’orchestratore garantisce **che il flusso sia robusto**

------

## 4. Pattern

Per i  due esempi, usiamo questi pattern:

### Pattern 1: Event-driven routing

Ogni evento entra su un bus con uno schema comune:

```json
{
  "event_type": "PASSWORD_RESET_REQUESTED",
  "event_id": "uuid",
  "source": "web_portal",
  "timestamp": "2026-04-15T10:00:00Z",
  "payload": {
    "user_id": "123",
    "email": "cliente@example.com"
  }
}
```

L’orchestratore legge `event_type` e inoltra al relativo agente.

### Pattern 2: Stateless agent + state esterno

Meglio che gli agenti siano **stateless**.
Lo stato va in servizi esterni:

- DB transazionale
- Redis per cooldown/lock
- CRM / e-commerce DB
- event store / audit log

Questo rende tutto più scalabile e più facile da testare.

### Pattern 3: Idempotency first

Fondamentale. Se lo stesso evento arriva due volte:

- non inviare due reset link
- non mandare due reminder per lo stesso carrello

Quindi ogni azione deve usare:

- `event_id`
- `correlation_id`
- chiavi idempotenti tipo `cart_id + campaign_type`

### Pattern 4: Rule engine configurabile

Per tanti casi futuri, non hardcodiamo nulla, ma definiamo regole configurabili tipo:

```yaml
rule: cart_abandonment_24h
when:
  event_type: CART_INACTIVE
  inactivity_hours_gte: 24
  purchase_completed: false
then:
  action: send_email_template
  template: cart_reminder_v1
```

Questo aiuta a scalare oltre i primi due agenti.

------

## 5. Se vuoi usare davvero il concetto di “agent”

### Livello 1 — Reflex Agents

Per task immediati e deterministici:

- password reset
- carrello abbandonato
- email auto-response
- ticket routing semplice

### Livello 2 — Goal/Workflow Agents

Per processi multi-step:

- onboarding cliente
- recupero account con verifica identità
- escalation ticket
- gestione reclami

### Livello 3 — AI/LLM Agents

Solo dove serve interpretazione:

- classificare email libere
- estrarre intent da testo non strutturato
- comporre risposta personalizzata
- suggerire next best action

In questo caso, il core deve stare nel **Livello 1**, con eventuale supporto AI solo all’ingresso email. Ad esempio:

- email contiene “non riesco ad accedere”, “password dimenticata”, “reset password”
- un classificatore NLP/LLM traduce tutto in evento standard `PASSWORD_RESET_REQUESTED`

Questa è la parte “intelligente”. Ma l’esecuzione deve restare **deterministica**.

------

## 6. Proposta concreta di architettura

Io andrei con questa:

### Core

- **API/Webhook Layer**
- **Email Ingestion Service**
- **Event Bus**
- **Agent Orchestrator**
- **Rule Engine**
- **Action Services**
- **Audit & Monitoring**

### Agenti

- `CredentialRecoveryReflexAgent`
- `CartAbandonmentReflexAgent`

### Servizi di supporto

- `IdentityService`
- `TokenService`
- `EmailService`
- `CustomerProfileService`
- `CartService`
- `ConsentService`
- `AuditService`

### Storage

- DB per stati operativi
- Redis per lock/cooldown/idempotenza breve
- log eventi / observability stack

------

## 7. Flusso esempio: Password dimenticata

```text
1. Utente clicca "Password dimenticata"
2. Frontend invia evento PASSWORD_RESET_REQUESTED
3. Event bus pubblica evento
4. Orchestratore lo inoltra al CredentialRecoveryReflexAgent
5. L’agente verifica policy:
   - utente esiste?
   - rate limit ok?
   - account eligible?
6. Chiama TokenService
7. Chiama EmailService con template reset
8. AuditService registra outcome
9. Orchestratore marca evento completato
```

------

## 8. Flusso esempio: Carrello abbandonato

```text
1. Scheduler rileva carrelli inattivi > 24h
2. Genera evento CART_INACTIVE_24H
3. Event bus pubblica evento
4. Orchestratore instrada al CartAbandonmentReflexAgent
5. L’agente controlla:
   - ordine non completato
   - no reminder già inviato
   - contatto consentito
6. Chiama EmailService con template reminder
7. Aggiorna stato campagna
8. Audit e metriche
```

------

## 9. Scelta pratica: orchestrazione centralizzata o coreografata?

Per iniziare: **orchestrazione centralizzata leggera**.

Perché:

- hai pochi use case
- vuoi controllo
- debugging più semplice
- audit chiaro
- meno dispersione logica

La coreografia pura a eventi conviene quando hai molti domini e team separati.
All’inizio rischia di diventare opaca.

Quindi:

- **event bus** per disaccoppiamento
- **orchestrator** per governo del flusso

È un buon compromesso.

------

## 10. Cose da non dimenticare

Per questi agenti sono cruciali:

- **idempotenza**
- **rate limiting**
- **cooldown** su invio email/reset
- **audit trail**
- **template management**
- **consent/privacy checks**
- **dead letter queue** per errori
- **retry policy**
- **observability** con metriche come:
  - eventi ricevuti
  - agenti eseguiti
  - error rate
  - email inviate
  - duplicate evitati
  - tempo medio di risposta
