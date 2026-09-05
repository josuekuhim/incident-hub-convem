# Implementation Plan: Incident Hub — Plano Conjunto das Fatias 001–005

**Branch**: `000-project-plan` | **Date**: 2026-09-05 | **Specs**: [001](../001-incident-hub-foundation/spec.md) · [002](../002-incident-creation/spec.md) · [003](../003-status-transition-rules/spec.md) · [004](../004-status-change-detail/spec.md) · [005](../005-filters-dashboard/spec.md)

**Input**: As cinco specs do projeto, planejadas em um único plan (decisão do usuário), mantendo implementação **uma fatia por vez** (constituição: Fluxo de Trabalho).

## Summary

Construir o Incident Hub: aplicação web local de registro de incidentes
operacionais — persistência local sobrevivente a reinício, seed idempotente,
listagem com filtros, criação validada, regra de transição pura (Critical não
vai de Open direto para Resolved), histórico somente-adição, tela de detalhe e
dashboard com três contadores. Abordagem técnica: monorepo npm workspaces já
existente (`apps/api` Fastify + `apps/web` Vue), persistência em **SQLite via
`node:sqlite`** (biblioteca padrão do Node 24 — substitui o `better-sqlite3`
nativo do scaffold), testes com **`node:test`** (padrão), máquina de estados
em um único módulo puro.

## Technical Context

**Language/Version**: TypeScript 5.9 (ES2022, strict) sobre Node.js 24 (runtime
presente: v24.19.0)

**Primary Dependencies**: API — `fastify` (roteamento HTTP + serialização;
justificado: redução de código de protocolo e tratamento de erros; mantido do
scaffold). Front — `vue` + `vite` (justificado: UI reativa simples; mantidos do
scaffold). Removidos: `better-sqlite3`, `drizzle-orm`, `drizzle-kit`,
`@fastify/cors` (ver Constitution Check e research.md). Adicionados: **nenhum**
— `node:sqlite` e `node:test` são biblioteca padrão.

**Storage**: SQLite em arquivo único (`node:sqlite` `DatabaseSync`), caminho
configurável por `SQLITE_PATH` com default funcional (`data/incident-hub.db`),
modo WAL.

**Testing**: `node:test` (runner padrão do Node) executado via `tsx --test`;
testes de domínio puros (matriz de transição) e de integração (API + banco em
arquivo temporário + reinício de processo).

**Target Platform**: Local — Node 24 em Linux/macOS/Windows; front servido pelo
Vite em dev e por nginx (Docker) em produção simulada.

**Project Type**: Monorepo npm workspaces (web application: `apps/api` + `apps/web`)

**Performance Goals**: N/A (escopo local, ambiente único; sem meta de
throughput — a constituição exclui deploy público).

**Constraints**: Sem compilação nativa; sem passo manual fora do README; toda
variável de ambiente com default funcional; uma task por vez com diff pequeno.

**Scale/Scope**: 5 fatias, ~2 módulos de aplicação, 3 entidades lógicas
(Incident, StatusChange, regra pura), 7 endpoints.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Re-check pós-design (2026-09-05, após research/data-model/contracts/quickstart)**:
GATE continua PASS. Confirmações do design: VII — `node:sqlite` verificado
funcional no Node 24.19 (`DatabaseSync` testado), zero dependências novas
adicionadas pelo plan (apenas remoções); III — `status-rules.ts` permanece o
único arquivo com regra de transição, rotas e UI apenas consomem; IV — o
data-model define `status_changes` sem qualquer caminho de UPDATE/DELETE e a
transação única (R7) garante indivisibilidade status+histórico; V — testes
especificados por fatia com `node:test`, incluindo matriz 36 casos, contadores
com Critical em In Progress e reinício por subprocesso (R10); VI — contrato de
erro único `{error}` nomeando campo/filtro, 404 específico para id inexistente.

| # | Princípio | Status | Evidência / Ação |
|---|-----------|--------|------------------|
| I | Correção primeiro | ✅ PASS | Scaffold existente viola as specs (status `investigating` em vez de In Progress; criação aceita só `title`, sem `owner`, com defaults silenciosos). Correção é pré-requisito das fatias: o plan determina **corrigir antes de estender**. |
| II | Escopo fechado | ✅ PASS | Nenhuma fatia inclui auth, permissões, edição/exclusão, busca, paginação ou deploy público. |
| III | Máquina de estados pura e centralizada | ✅ PASS | `apps/api/src/domain/status-rules.ts` — única função pura, único arquivo, sem I/O; consumida por rotas via import; proibido duplicar em rota/componente (spec 004 FR-001). |
| IV | Persistência e histórico somente-adição | ✅ PASS | SQLite em arquivo (sobrevive a reinício); tabela `status_changes` sem UPDATE/DELETE em código — somente `INSERT`; exatamente 1 registro por transição aceita, na mesma unidade de trabalho que status+updatedAt. |
| V | Testes obrigatórios | ✅ PASS | Matriz 4×3×3 da regra (fatia 003), contadores do dashboard com Critical em Open **e** In Progress (fatia 005), persistência após reinício (001/002/004), campos obrigatórios ausentes (002). Runner padrão, zero dependência nova. |
| VI | Falhas explícitas | ✅ PASS | Contrato de erro único `{ error: string }` em português, nomeando o campo; 404 específico para id inexistente; criação/seed sem gerar histórico. |
| VII | Portabilidade e dependências | ⚠️ REMEDIAR | **Violação encontrada no scaffold**: `better-sqlite3` é módulo nativo (compilação C++ via node-gyp quando não há binário pré-compilado). **Ação**: substituir por `node:sqlite` (biblioteca padrão do Node 24 — sem compilação, sem download de binário). Removidos também `drizzle-orm`/`drizzle-kit` (ORM desnecessário para 2 tabelas; SQL direto) e `@fastify/cors` (desnecessário: front usa proxy `/api` em dev e nginx same-origin em prod). Zero variável de ambiente sem default (`PORT`→3000, `SQLITE_PATH`→`data/incident-hub.db`). README único caminho de bootstrap. |
| VIII | Rastreabilidade e emendas | ✅ PASS | `AI_LOG.md` já em uso; emendas deste plan registradas lá e em `PLAN.md` do projeto quando aplicável. |

**Veredito**: GATE PASSA com uma remediação obrigatória (VII) incorporada como
task da fatia 001 — sem ela, nenhum clone limpo sobe sem toolchain de
compilação C++, quebrando "subir em clone limpo seguindo apenas o README".

## Project Structure

### Documentation (this plan)

```text
specs/000-project-plan/
├── plan.md              # Este arquivo
├── research.md          # Decisões técnicas (Phase 0)
├── data-model.md        # Entidades, validações, transições (Phase 1)
├── contracts/           # Contrato da API REST (Phase 1)
│   └── api.md
└── quickstart.md        # Guia de validação ponta a ponta (Phase 1)
```

### Source Code (repository root)

```text
apps/api/
├── src/
│   ├── domain/
│   │   └── status-rules.ts        # FATIA 003: função pura — único lugar com
│   │                              #   regras de transição (sem I/O, sem framework)
│   ├── db/
│   │   └── sqlite.ts              # conexão node:sqlite, DDL (CREATE TABLE IF
│   │                              #   NOT EXISTS), default de SQLITE_PATH
│   ├── seed.ts                    # FATIA 001: seed idempotente (INSERT OR IGNORE)
│   ├── http/
│   │   ├── errors.ts              # mapeamento para { error } + status codes
│   │   └── validation.ts          # validação de entrada (criação, filtros)
│   ├── routes/
│   │   └── incidents.ts           # endpoints REST (usam domain/ e db/)
│   └── server.ts                  # bootstrap: db → seed → rotas → listen
└── test/
    ├── domain/status-rules.test.ts    # matriz 36 casos (fatia 003)
    ├── integration/*.test.ts          # API + banco temporário + reinício
    └── helpers.ts                     # spawn de servidor em porta/isolamento próprios

apps/web/
└── src/
    ├── api.ts                   # cliente HTTP tipado (único lugar que fala com a API)
    ├── App.vue                  # composição: listagem + formulário + dashboard
    └── components/
        ├── IncidentList.vue     # FATIA 001/005: lista + filtros + estado vazio
        ├── IncidentForm.vue     # FATIA 002: criação com 4 campos obrigatórios
        ├── IncidentDetail.vue   # FATIA 004: detalhe + histórico + transição
        └── Dashboard.vue        # FATIA 005: três contadores
```

**Structure Decision**: manter o monorepo npm workspaces do scaffold
(`apps/api`, `apps/web`); a regra pura fica em `apps/api/src/domain/` —
arquivo único, isolado de rotas/UI/persistência, alterável sem tocar em
qualquer outro módulo.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (remediação, não violação nova) Substituição de `better-sqlite3`/`drizzle` por `node:sqlite` + SQL direto | Constituição proíbe módulo nativo e pede biblioteca padrão | Manter better-sqlite3 exigiria toolchain de compilação C++ em máquinas sem binário pré-compilado; manter ORM adicionaria 2 dependências para 2 tabelas |

## Sequenciamento das Fatias (execução)

1. **Remediação + 001** — trocar SQLite para `node:sqlite`, corrigir enum de
   status, criar `status_changes`, seed idempotente, listagem com estado vazio,
   README. Testes: persistência + reinício + seed idempotente.
2. **002** — criação com 4 campos obrigatórios, sistema define id/status/createdAt/updatedAt, entrada enviada ignorada, rejeições nomeando campo. Testes: 8 casos de ausente/vazio, severidade inválida, status Resolved ignorado.
3. **003** — `status-rules.ts` puro + matriz 36 casos em `node:test`. Nada mais muda.
4. **004** — transição via rota consumindo a 003, histórico append-only, tela de detalhe, 404 específico. Suíte da 003 deve permanecer verde.
5. **005** — filtros combináveis + dashboard 3 contadores (Critical conta em Open e In Progress).

Cada fatia termina em commit com suíte completa verde (constituição: nenhum
commit com teste vermelho; uma task por vez).
