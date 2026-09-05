# Quickstart: Incident Hub — Guia de Validação Ponta a Ponta

Data: 2026-09-05 · Fontes: specs 001–005, contracts/api.md

## Pré-requisitos

- Node.js 24+ (única toolchain; nenhuma compilação nativa envolvida)
- npm (incluído no Node)

## Setup (clone limpo — único caminho: README)

```bash
npm install        # instala workspaces (api + web)
npm run seed       # seed idempotente (pode rodar quantas vezes quiser)
npm run dev        # sobe api (3000) e web (5173) em paralelo
```

Abra http://localhost:5173. Sem nenhuma variável de ambiente configurada —
`PORT` (3000), `SQLITE_PATH` (`data/incident-hub.db`) e afins têm defaults
funcionais (constituição VII).

Testes da suíte completa:

```bash
npm test           # node:test: domínio (matriz) + integração (API, reinício)
```

## Cenários de validação (por fatia)

### 001 — Fundação
1. Após `npm run seed` + `npm run dev`, a lista exibe os 3 incidentes:
   Payment API instability (Critical, Ana, Open), Reconciliation delay (High,
   Bruno, In Progress), Incorrect customer notification (Medium, Carla,
   Resolved).
2. Rodar `npm run seed` de novo → continua exatamente 3 (idempotente).
3. Encerrar `npm run dev` (Ctrl+C) e rodar de novo → os 3 continuam (dados
   sobrevivem ao reinício do processo; conferir também `GET /incidents`
   direto na porta 3000 sem reexecutar o seed).
4. (Estado vazio) Com `SQLITE_PATH` apontando para arquivo novo e sem seed:
   lista exibe "Nenhum incidente registrado" — não erro.

### 002 — Criação
1. Criar incidente com os 4 campos → sucesso; aparece na lista como **Open**.
2. Omitir/enver vazio cada um dos 4 campos, um por vez → mensagem da API
   nomeando o campo; nada gravado.
3. Severidade "Urgent" → rejeitada com mensagem do campo severity.
4. Enviar `"status": "Resolved"` (e id/createdAt) no body → ignorado; nasce
   Open.
5. Criar e reiniciar o processo → incidente persiste.

### 003 — Regra pura (validada por `npm test`)
A matriz de 36 combinações passa sem tocar em banco, rede, relógio ou UI.

### 004 — Transição + detalhe
1. Critical em Open → tentar Resolved → recusada com motivo indicando In
   Progress; status, updatedAt e histórico intactos.
2. Mesmo Critical: Open → In Progress → Resolved → 2 registros de histórico,
   ordem cronológica correta.
3. High em Open → Resolved → aceita; 1 registro.
4. Detalhe exibe os 8 campos + histórico; id inexistente (`/incidents/99999`)
   → "Incidente não encontrado", não erro genérico.
5. Após transições, reiniciar o processo → status e histórico persistem.

### 005 — Filtros + dashboard
1. Filtro status=Open → só o incidente em Open; severity=High → só o High;
   ambos combinados → interseção (vazio quando não há cruzamento, com estado
   vazio compreensível).
2. Filtro inválido (`status=Archived`) → mensagem nomeando o filtro.
3. Com os dados do seed: dashboard mostra **1 aberto, 1 Critical não
   resolvido, 1 resolvido**.
4. Mover o Critical Open → In Progress → **0 abertos, 1 Critical não
   resolvido** (In Progress conta!).
5. Mover esse Critical → Resolved → **0 Critical não resolvidos, 2
   resolvidos**.

## Regressão

Ao final de qualquer fatia: `npm test` 100% verde — incluindo a matriz da
fatia 003 (constituição V e spec 004 FR-008).
