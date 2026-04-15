# ADR-003: Deploy Strategy — Docker Compose su WSL (Dev Environment)

## Status
Accepted

## Date
2026-04-15

## Context
L'ambiente di sviluppo gira su **Windows con WSL** (Windows Subsystem for Linux).
Il target di esecuzione è Docker via WSL; il codice non va in produzione in questa fase.

Sono emerse quattro classi di problemi durante il primo build e il primo test:

1. **Lock file assente**: `npm ci` richiede `package-lock.json` pre-esistente.
   Non avendo mai eseguito `npm install` in locale, il build falliva con exit code 1.

2. **CRLF nei file di configurazione**: i file creati o modificati su Windows (anche
   tramite editor o tool) possono contenere line endings `\r\n`. nginx e sh nei
   container Alpine (Linux) si aspettano `\n`: un `.conf` con CRLF causa errori
   oscuri a runtime (`invalid directive`, `unknown directive`).

3. **Visibilità degli errori**: `npm install --silent` sopprimeva output utile al
   debug; i log di Docker erano vuoti in caso di fallimento.

4. **Conflitto porta 80 su Windows**: la porta 80 è occupata da un servizio Windows
   (IIS / World Wide Web Publishing Service / WAS). Docker in WSL2 la mappa
   correttamente all'interno di WSL (`curl http://localhost/` da WSL → 200 OK),
   ma le richieste provenienti dal browser Windows su `127.0.0.1:80` vengono
   intercettate dal servizio Windows prima di raggiungere Docker, restituendo 404.
   La diagnosi è stata confermata con:
   ```bash
   # da WSL — funziona: raggiunge Docker via IPv6 (::1)
   curl -v http://localhost/   # → HTTP 200, nginx/1.27.5

   # dall'interno del proxy — funziona: routing Docker corretto
   docker exec agentic-integration-proxy wget -S -O /dev/null http://frontend/  # → 200 OK

   # dall'interno del frontend — fallisce: nessun servizio su 127.0.0.1 interno
   docker exec agentic-integration-frontend wget -S -O /dev/null http://localhost/  # → Connection refused
   ```

## Decision

### 1 — `npm install` invece di `npm ci`
`npm ci` viene riservato a pipeline CI/CD con `package-lock.json` versionato.
Nel build Docker di sviluppo si usa `npm install --no-audit --no-fund`:
- non richiede lock file pre-esistente
- `--no-audit` elimina la chiamata di rete al registry per la security audit (evita timeout)
- `--no-fund` sopprime i messaggi di funding (rumore nei log)
- l'output di errore rimane visibile

### 2 — Strip CRLF nei Dockerfile
Dopo ogni `COPY *.conf` (sia `frontend/` che `proxy/`), viene eseguito:
```dockerfile
RUN sed -i 's/\r//' /etc/nginx/conf.d/default.conf
```
Questo bonifica i CRLF a build-time, indipendentemente da come il file è stato
salvato sull'host. La correzione è idempotente: se il file è già LF, non fa nulla.

### 3 — `.gitattributes` con `eol=lf`
Aggiunto `.gitattributes` alla root del repository con `* text=auto eol=lf` e
regole esplicite per `.conf`, `Dockerfile`, `.yml`, `.js`, `.jsx`, `.json`, `.html`.
Garantisce che Git normalizzi i line endings a LF su qualunque OS al checkout,
prevenendo il problema alla fonte per tutti i contributor futuri.

### 4 — Architettura di build multi-stage (invariata, confermata)
```
node:20-alpine  →  npm install + vite build  →  dist/
nginx:1.27-alpine  →  dist/ + nginx.conf  →  immagine finale
```
Il layer `node_modules` è escluso dall'immagine finale. Nessun runtime Node in
produzione. L'immagine nginx risultante è ~25 MB.

### 5 — Porta esterna 8080 in ambiente dev Windows/WSL
La porta 80 su Windows è occupata da IIS/WAS. La mappatura Docker viene cambiata
da `80:80` a `8080:80` in `docker-compose.yml`:

```yaml
ports:
  - "8080:80"   # 8080 externally — porta 80 su Windows occupata (IIS/WAS)
```

Il routing interno Docker rimane invariato: proxy e frontend comunicano su porta 80
dentro la rete `agentic-net`. Solo il punto di ingresso esterno cambia.

In produzione su un server Linux senza conflitti, si torna a `80:80`.

### 6 — Comando di avvio (unico, senza passi manuali)
```bash
# da WSL, nella root del repository
docker compose up -d --build
# accesso dal browser Windows → http://localhost:8080
```
Non è richiesta nessuna esecuzione manuale preliminare (no `npm install` locale,
no generazione di lock file, no setup di variabili d'ambiente).

## Alternatives Considered

| Opzione | Pros | Cons | Esito |
|---------|------|------|-------|
| Committare `package-lock.json` e usare `npm ci` | build riproducibile | richiede `npm install` locale su Windows/WSL prima del primo commit | rimandato a quando si introduce CI/CD |
| Volume mount del codice sorgente (dev mode) | hot reload senza rebuild | complessità WSL↔Windows per i path, non allineato al target Docker | non adatto a questo stage |
| `.env` con flag per disabilitare audit | flessibile | un file in più da gestire | non necessario con i flag inline |
| `dos2unix` nel Dockerfile | esplicito | dipendenza extra da installare in Alpine | `sed` già presente, preferito |
| Disabilitare IIS su Windows per liberare porta 80 | mantiene porta 80 | modifica configurazione di sistema Windows, impatta altri servizi | troppo invasivo per un env dev |
| Accedere tramite IP WSL anziché localhost | nessuna modifica al compose | IP WSL2 cambia a ogni reboot, non ergonomico | scartato |

## Trade-offs
- **Gain:** build zero-prerequisiti da WSL con un solo comando.
- **Gain:** CRLF bonificati sia a build-time (sed) che a checkout (gitattributes).
- **Cost:** senza lock file versionato, `npm install` può risolvere versioni diverse
  tra build distanti nel tempo — accettabile in dev, da correggere prima di CI/CD.
- **Cost:** `--no-audit` disabilita la scansione delle vulnerabilità npm durante il
  build — da riabilitare quando si introduce una pipeline di sicurezza dedicata.

## Validation Plan
- `docker compose up -d --build` completa senza errori su WSL
- `docker ps` mostra `proxy` e `frontend` in stato `healthy`
- `curl http://localhost:8080/` da WSL restituisce HTTP 200 con la React dashboard
- Browser Windows su `http://localhost:8080` mostra la dashboard
- `docker compose logs proxy` non mostra errori di parsing nginx
- `docker ps` non mostra `0.0.0.0:80` (porta 80 non esposta in dev)

## Rollback Strategy
Nessun dato persistente nei container. Per tornare allo stato precedente:
```bash
docker compose down
git revert <commit>
docker compose up -d --build
```

## Decisioni future collegate
- Quando si introduce CI/CD: aggiungere `npm ci`, versionare `package-lock.json`,
  riabilitare `--audit`.
- Quando si aggiunge il backend Python: aggiungere il servizio in `docker-compose.yml`
  e decommentare il blocco `upstream backend` in `proxy/nginx.conf`.
- Per produzione: valutare TLS termination nel proxy, immagini tagged anziché `latest`,
  secrets management.

## References
- ADR-001 — Frontend React + Vite + Docker
- ADR-002 — Nginx Reverse Proxy
- [npm install vs npm ci](https://docs.npmjs.com/cli/v10/commands/npm-ci)
- [gitattributes eol](https://git-scm.com/docs/gitattributes#_end_of_line_conversion)
