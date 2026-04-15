# Agentic-Integration

Dashboard per il trigger di agenti specializzati in ambito commerce.

## Avvio rapido (WSL + Docker)

```bash
docker compose up -d --build
```

Apri nel browser: **http://localhost:8080**

> **Nota — porta 8080 in ambiente dev Windows/WSL**
> La porta 80 su Windows è occupata da IIS / World Wide Web Publishing Service.
> Docker in WSL2 viene esposto su **8080** per evitare il conflitto.
> Il routing interno tra i container rimane tutto su porta 80.
> In produzione su Linux si usa `80:80` senza modifiche all'architettura.
> Dettagli e diagnosi: [`docs/adr/ADR-003`](docs/adr/ADR-003-deploy-strategy-wsl-docker.md)

## Stack

| Layer    | Tecnologia |
|----------|-----------|
| Frontend | React 18 + MUI v5 |
| Proxy    | nginx (reverse proxy) |
| Backend  | Python *(non ancora implementato)* |
| Deploy   | Docker Compose |
