# AI_LOG.md

Registro de interações relevantes com IA, no momento em que acontecem
(Princípio VIII da constituição).

## 2026-09-05 — Constituição

- **$speckit-constitution** — Constituição ratificada em
  `.specify/memory/constitution.md` (v1.0.0, ratificação inicial). O resolvedor
  de templates exigiu um shim temporário de `python3` para o Python 3.14 real;
  nenhum arquivo do projeto foi alterado por esse contorno.

## Spec 000 — Plano do Projeto

- **$speckit-plan** — Criado o plano conjunto em
  `specs/000-project-plan/`: `plan.md`, `research.md`, `data-model.md`,
  `contracts/api.md` e `quickstart.md`. Decisão R1: substituir
  `better-sqlite3`/Drizzle por `node:sqlite`, pois módulos nativos são
  proibidos pela constituição.
- **$speckit-tasks** — Geradas T001–T030 em oito fases para as fatias 001–005.
- **$speckit-implement (infra e polish)** — T001–T005 implementadas:
  dependências proibidas removidas, scripts raiz criados, enums canônicos,
  SQLite com WAL/foreign keys e helper de integração. T028–T030 concluídas:
  README com bootstrap local e Docker, limpeza de artefatos/arquivos Drizzle
  mortos, Dockerfiles coerentes e validação ponta a ponta. Correção adicional:
  `@types/node` declarado em `apps/web` para o build isolado no container.
- **Validação ampliada** — Criados testes unitários em
  `apps/api/test/domain/validation.test.ts` para criação (texto obrigatório e
  trim), status canônicos e filtros válidos/vazios/inválidos. Criado teste de
  aceitação em `apps/api/test/integration/acceptance.test.ts`, cobrindo seed e
  datas ISO, criação válida/inválida, proteção contra campos controlados pelo
  cliente, bloqueio Critical Open → Resolved sem efeitos, sequência permitida
  com histórico cronológico, filtros (interseção e erro explícito) e dashboard.
  Validação final: `npm test` = 12/12 verde; `npm run build` verde; `docker
  compose up --build -d` verde; `/health` = ok, frontend = HTTP 200 e proxy
  `/api/incidents` funcional.

## Spec 001 — Fundação do Incident Hub

- **$speckit-specify** — Criada
  `specs/001-incident-hub-foundation/spec.md`: persistência, seed idempotente,
  listagem, estado vazio e sobrevivência a reinício.
- **$speckit-implement (T006–T011)** — Testes de listagem, seed e persistência
  implementados. Criados `seed.ts`, bootstrap do servidor, GET `/incidents` e
  a listagem inicial. O seed grava três incidentes por `seed_key`, sem gerar
  histórico. A listagem foi posteriormente substituída pelo Kanban da spec
  006, preservando a API e o estado vazio.

## Spec 002 — Criação de Incidente

- **$speckit-specify** — Criada
  `specs/002-incident-creation/spec.md`: quatro campos obrigatórios, valores
  de sistema e erros nomeando o campo inválido.
- **$speckit-implement (T012–T016)** — Criados `validation.ts`, `errors.ts`,
  POST `/incidents` e `IncidentForm.vue`. O endpoint ignora id/status/datas
  enviados pelo cliente, cria sempre em Open e não cria histórico. Os testes
  cobrem campos ausentes/vazios, enum inválido e persistência.

## Spec 003 — Regra de Transição de Status

- **$speckit-specify** — Criada
  `specs/003-status-transition-rules/spec.md`: matriz pura de 36 combinações,
  incluindo a restrição Critical Open → Resolved.
- **$speckit-implement (T017–T018)** — Criada a função pura
  `avaliarTransicao` em `domain/status-rules.ts`. A matriz 4×3×3 está coberta
  por testes: 36/36 combinações verdes, sem I/O, banco, rede ou framework.

## Spec 004 — Alteração de Status, Histórico e Detalhe

- **$speckit-specify** — Criada
  `specs/004-status-change-detail/spec.md`: transição persistida, histórico
  somente-adição e detalhe do incidente.
- **$speckit-implement (T019–T022)** — Implementados POST
  `/incidents/:id/status` usando exclusivamente `avaliarTransicao` e uma
  transação SQL (UPDATE + INSERT), e GET `/incidents/:id` com histórico
  cronológico. Criado `IncidentDetail.vue` com 8 campos, datas em pt-BR,
  histórico e mensagem da API para recusas. Os testes cobrem 422 sem efeitos,
  404, append-only e reinício.

## Spec 005 — Filtros e Dashboard

- **$speckit-specify** — Criada
  `specs/005-filters-dashboard/spec.md`: filtros combináveis e dashboard com
  Critical não resolvidos incluindo In Progress.
- **$speckit-implement (T023–T027)** — GET `/incidents` aceita filtros
  `status`/`severity` com interseção e rejeição explícita de valores inválidos.
  GET `/dashboard` calcula open, criticalUnresolved e resolved a partir dos
  dados atuais. Testes cobrem filtros, interseção, estados vazios e sequência
  numérica 1/1/1 → 0/1/1 → 0/0/2. A UI foi evoluída na spec 006: controles de
  status e severity são aplicados client-side e em combinação no quadro.

## Spec 006 — Quadro Kanban Interativo

- **$speckit-specify** — Criada
  `specs/006-kanban-board/spec.md` e seu checklist: três colunas por status,
  transição inline e atualização sem recarregar a página.
- **$speckit-implement (T031–T034)** — Criado `KanbanBoard.vue`, substituindo
  a listagem linear. O quadro tem colunas Open/In Progress/Resolved com
  contadores, cards com destaque por severidade, botões de transição inline,
  bloqueio durante a requisição, feedback de recusa no próprio card e histórico
  da sessão. `App.vue` atualiza o quadro após criação/detalhe; `api.ts` extrai
  mensagens de `{ error }`. Adicionado seletor de status, combinado com o de
  severity, para expor integralmente os filtros da spec 005 na UI. Validado via
  Docker: Critical Open → Resolved foi bloqueado; Open → In Progress → Resolved
  moveu o card e atualizou dashboard sem reload. A combinação visual
  status=Resolved + severity=Critical mostrou apenas os dois cards compatíveis,
  sem navegação ou reload. `npm test`: 12/12 verde; builds da API e web verdes.
