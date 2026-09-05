# Incident Hub

## Requisitos

- Node.js 24+
- npm
- Docker e Docker Compose (opcional, para execução em containers)

## Execução local

```bash
npm install
npm run seed
npm run dev
```

A API fica disponível em http://localhost:3000 e a web em http://localhost:5173.

## Execução com Docker Compose

```bash
docker compose up --build
```

Depois do build, a aplicação fica disponível em:

- Web: http://localhost:8080
- API: http://localhost:3000

O frontend encaminha requisições para a API via `/api`, então a interface funciona sem ajustes adicionais.
Para limpar os dados persistidos do SQLite, use:

```bash
docker compose down -v
```

## Comandos

- `npm test` — executa a suíte de testes da API
- `npm run seed` — popula o banco SQLite com os incidentes de exemplo
- `npm run dev` — inicia a API e a web em paralelo
- `npm run build` — gera os builds de produção da API e da web
- `docker compose up --build` — constrói e inicia o ambiente com Docker
- `docker compose down` — encerra os containers

## Variáveis de ambiente

- `PORT` (padrão: `3000`)
- `SQLITE_PATH` (padrão: `data/incident-hub.db`)
