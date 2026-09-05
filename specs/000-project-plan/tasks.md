---
description: "Task list para o plano conjunto das fatias 001–006 do Incident Hub"
---

# Tasks: Incident Hub — Fatias 001–006 (plano conjunto)

**Input**: Design documents from `/specs/000-project-plan/` (plan.md, spec.md-índice, research.md, data-model.md, contracts/api.md, quickstart.md)

**Prerequisites**: plan.md ✅ · spec.md ✅ (índice; normas nas specs 001–006) · research.md ✅ · data-model.md ✅ · contracts/ ✅

**Tests**: OBRIGATÓRIOS (constituição, Princípio V — não opcionais neste projeto). Toda task de implementação vem após a task de teste correspondente quando aplicável, e **nenhum commit acontece com teste vermelho**.

**Organization**: Tasks agrupadas por user story. US1–US5 correspondem às fatias 001–005; US6 (Phase 9) corresponde à fatia 006 (Kanban). **Constituição: uma task por vez, diff pequeno, suíte completa verde antes de cada commit.** Marcadores [P] indicam apenas ausência de conflito de arquivo — a execução permanece sequencial.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1..US5 = fatias 001–005)
- Include exact file paths in descriptions

## Path Conventions

- API: `apps/api/src/` e `apps/api/test/`
- Web: `apps/web/src/`
- Raiz: `README.md`, `package.json`

---

## Phase 1: Setup (remediação da constituição VII + infra de testes)

**Purpose**: Remover violações de dependência do scaffold e preparar a suíte.

- [x] T001 Remover dependências proibidas/desnecessárias de apps/api/package.json (`better-sqlite3`, `@types/better-sqlite3`, `drizzle-orm`, `drizzle-kit`, `@fastify/cors`), excluir apps/api/drizzle.config.ts, apps/api/src/db/schema.ts, apps/api/src/db/index.ts e apps/api/drizzle/ (se existir); atualizar package.json raiz (remover `allowScripts` de better-sqlite3)
- [x] T002 Adicionar scripts à raiz package.json: `test` (tsx --test em apps/api/test), `seed` (tsx apps/api/src/seed.ts via workspace @incident-hub/api) e `dev` (api+web em paralelo); nenhuma variável de ambiente sem default (PORT=3000, SQLITE_PATH=data/incident-hub.db)

---

## Phase 2: Foundational (bloqueia todas as stories)

**Purpose**: Camada de persistência `node:sqlite`, constantes de domínio e infra de teste — pré-requisito de todas as fatias.

- [x] T003 Criar apps/api/src/domain/constants.ts com os enums canônicos (`Status`: Open, In Progress, Resolved; `Severity`: Low, Medium, High, Critical) e tipos compartilhados (Incident, StatusChange, ISO na borda) conforme data-model.md
- [x] T004 Criar apps/api/src/db/sqlite.ts: conexão `node:sqlite` DatabaseSync com SQLITE_PATH default `data/incident-hub.db` (mkdir recursivo), pragma WAL + foreign_keys, DDL `CREATE TABLE IF NOT EXISTS` para `incidents` (id, title, description, severity, owner, status, created_at, updated_at, seed_key UNIQUE NULL, CHECKs de enum) e `status_changes` (id, incident_id REFERENCES, from_status, to_status, changed_at) conforme data-model.md
- [x] T005 Criar apps/api/test/helpers.ts: spawn do servidor como subprocesso real (porta efêmera, SQLITE_PATH em arquivo temporário), espera de prontidão via /health e encerramento limpo — base dos testes de reinício (research R10)

**Checkpoint**: Foundation pronta; stories podem começar (sempre em ordem US1→US5).

---

## Phase 3: User Story 1 — Fundação: modelo persistido, seed e listagem (fátia 001) ⭐ MVP

**Goal**: Aplicação sobe em clone limpo pelo README; 3 incidentes do seed listados com status corretos; sobrevive a reinício; seed idempotente; estado vazio compreensível.

**Independent Test**: `npm install && npm run seed && npm run dev` em clone limpo → lista com os 3 incidentes; segunda execução do seed não duplica; reinício do processo mantém os dados (quickstart.md, cenários 001).

### Tests for User Story 1

> **NOTE**: Escrever primeiro; confirmar que FALHAM antes de implementar.

- [x] T006 [P] [US1] Teste de integração em apps/api/test/integration/list.test.ts: GET /incidents retorna os 3 incidentes do seed com título/severidade/responsável/status corretos; sem seed retorna []
- [x] T007 [P] [US1] Teste de integração em apps/api/test/integration/seed.test.ts: rodar o seed duas vezes não duplica (continua 3); seed grava direto com status indicado e 0 registros em status_changes
- [x] T008 [P] [US1] Teste de integração em apps/api/test/integration/persistence.test.ts: dados sobrevivem ao reinício do PROCESSO (helper T005: sobe servidor, cria estado, mata, sobe de novo no mesmo SQLITE_PATH, confere)

### Implementation for User Story 1

- [x] T009 [US1] Criar apps/api/src/seed.ts: 3 incidentes da spec 001 com seed_key UNIQUE e INSERT OR IGNORE (idempotência por seed_key, não por título — research R5); status gravados direto; sem histórico; executável standalone (npm run seed)
- [x] T010 [US1] Reescrever apps/api/src/server.ts: bootstrap db → seed (opcional via flag/env com default documentado) → rotas; GET /incidents (createdAt decrescente, ISO 8601 na borda — research R6); sem CORS (research R4); criar apps/api/src/routes/incidents.ts com o GET
- [x] T011 [US1] Reescrever apps/web/src/App.vue e criar apps/web/src/components/IncidentList.vue + apps/web/src/api.ts: lista com título, severidade, responsável, status; estado vazio "Nenhum incidente registrado" (não erro); remoção do formulário provisório do scaffold (formulário volta na US2)
  > Nota: IncidentList.vue foi substituído por KanbanBoard.vue na fatia 006 (T031).

**Checkpoint US1**: MVP funcional — validar cenários 001 do quickstart.md. Commit com `npm test` verde.

---

## Phase 4: User Story 2 — Criação de incidente validada (fatia 002)

**Goal**: POST /incidents com 4 campos obrigatórios; sistema define id/status Open/datas; entrada enviada ignorada; rejeição nomeando o campo; sem histórico.

**Independent Test**: Criar com os 4 campos → 201 e lista como Open; omitir/esvaziar cada campo → 400 nomeando o campo; severity fora do enum → 400; status "Resolved" no body → nasce Open (quickstart.md, cenários 002).

### Tests for User Story 2

- [x] T012 [P] [US2] Teste de integração em apps/api/test/integration/create.test.ts: criação válida → 201, nasce Open, createdAt=updatedAt, aparece na lista, 0 registros em status_changes; cada um dos 4 campos ausente E vazio (8 casos) → 400 com mensagem nomeando o campo; severity inválida → 400; body com id/status/createdAt → ignorados (inclusive status Resolved); incidente criado sobrevive ao reinício do processo

### Implementation for User Story 2

- [x] T013 [US2] Criar apps/api/src/http/validation.ts: validação de criação campo a campo (string, trim > 0), coletando erros; mensagens em português nomeando o campo conforme contracts/api.md
- [x] T014 [US2] Criar apps/api/src/http/errors.ts (se ainda não existir na US1): formato único `{ error: string }` + códigos (400/404/422)
- [x] T015 [US2] Adicionar POST /incidents em apps/api/src/routes/incidents.ts: usa validation.ts; ignora id/status/createdAt do body; grava com status Open, id e datas do sistema; 201 com o incidente
- [x] T016 [US2] Criar apps/web/src/components/IncidentForm.vue e integrar em App.vue: 4 campos obrigatórios; erro da API exibido verbatim; recarrega a lista após sucesso

**Checkpoint US2**: Criação ponta a ponta. Commit com `npm test` verde.

---

## Phase 5: User Story 3 — Regra de transição pura (fatia 003)

**Goal**: Função pura em arquivo único com a matriz 4×3×3; testes unitários das 36 combinações; nenhum outro arquivo mudando de comportamento.

**Independent Test**: `npm test` — matriz 36/36 verde sem tocar banco/rede/relógio/UI (quickstart.md, cenários 003).

### Tests for User Story 3

- [x] T017 [P] [US3] Teste unitário em apps/api/test/domain/status-rules.test.ts: as 36 combinações (4 severidades × 3 origens × 3 destinos) com resultado explícito conforme matriz da spec 003; casos-âncora com motivos semânticos (mesmo status; Critical deve passar por In Progress); determinismo (mesma entrada → mesma saída)

### Implementation for User Story 3

- [x] T018 [US3] Criar apps/api/src/domain/status-rules.ts: ÚNICA função pura `avaliarTransicao(severity, statusAtual, statusDestino)` → `{ permitido: true } | { permitido: false, motivo }`; sem I/O, sem relógio, sem framework, sem leitura de histórico (constituição III; spec 003 FR-001..007)

**Checkpoint US3**: Matriz verde. Commit com `npm test` verde.

---

## Phase 6: User Story 4 — Transição persistida e tela de detalhe (fatia 004)

**Goal**: POST /incidents/:id/status consumindo a função pura; aceita = status + updatedAt + exatamente 1 histórico (uma transação SQL); recusada = nada muda + motivo; GET /incidents/:id com histórico cronológico; 404 específico.

**Independent Test**: Critical Open→Resolved recusado intacto; Critical Open→In Progress→Resolved = 2 registros ordenados; High Open→Resolved = 1 registro; recusa não altera updatedAt; histórico sobrevive a reinício; suíte US3 verde (quickstart.md, cenários 004).

### Tests for User Story 4

- [x] T019 [P] [US4] Teste de integração em apps/api/test/integration/transition.test.ts: recusa Critical Open→Resolved (422 com motivo, status/updatedAt/histórico intactos); sequência Critical Open→In Progress→Resolved (2 registros cronológicos); High Open→Resolved (1 registro); mesmo status recusado sem alterar updatedAt; id inexistente → 404 "Incidente não encontrado"; histórico e status sobrevivem ao reinício; nenhuma operação altera/remove registros anteriores (append-only)

### Implementation for User Story 4

- [x] T020 [US4] Adicionar POST /incidents/:id/status em apps/api/src/routes/incidents.ts: carrega incidente (404 antes da regra), chama exclusivamente `avaliarTransicao` de domain/status-rules.ts (spec 004 FR-001 — proibido reimplementar); recusa → 422 com o motivo da função pura, zero efeitos; aceita → UMA transação SQL: UPDATE status+updated_at e INSERT em status_changes com from/to/changed_at=agora (research R7)
- [x] T021 [US4] Adicionar GET /incidents/:id em apps/api/src/routes/incidents.ts: incidente + `history` em ordem cronológica (mais antigo primeiro); id inexistente → 404 específico
- [x] T022 [US4] Criar apps/web/src/components/IncidentDetail.vue e integrar: 8 campos + histórico cronológico; ação de transição de status; motivo de recusa exibido verbatim da API (regra nunca reescrita na UI); histórico vazio → "sem mudanças de status registradas"

**Checkpoint US4**: Fluxo completo de transição. Commit com `npm test` verde INCLUINDO a matriz da US3 (spec 004 FR-008).

---

## Phase 7: User Story 5 — Filtros e dashboard (fatia 005)

**Goal**: Filtros status+severity combináveis (interseção) com rejeição explícita de valor inválido; GET /dashboard com 3 contadores (Critical não resolvidos inclui In Progress).

**Independent Test**: Filtros isolados e combinados contra o seed; valor inválido → 400 nomeando o filtro; dashboard 1/1/1 no seed → 0 abertos e 1 critical após Open→In Progress → 0 critical e 2 resolvidos após Resolved (quickstart.md, cenários 005).

### Tests for User Story 5

- [x] T023 [P] [US5] Teste de integração em apps/api/test/integration/filters.test.ts: cada filtro isolado retorna o subconjunto exato (3 status + 4 severidades contra o seed); combinação = interseção (incluindo par vazio → []); valor inválido → 400 nomeando o filtro; ausente/vazio = sem filtro (todos)
- [x] T024 [P] [US5] Teste de integração em apps/api/test/integration/dashboard.test.ts: seed → open=1, criticalUnresolved=1, resolved=1; Critical Open→In Progress → open=0, criticalUnresolved=1 (In Progress CONTA); Critical → Resolved → criticalUnresolved=0, resolved=2 (spec 005 FR-007)

### Implementation for User Story 5

- [x] T025 [US5] Estender GET /incidents em apps/api/src/routes/incidents.ts: query params status/severity validados em http/validation.ts (fora do enum → 400 nomeando o filtro — research R8); ambos presentes → interseção (SQL AND)
- [x] T026 [US5] Adicionar GET /dashboard em apps/api/src/routes/incidents.ts: 3 contadores recalculados do estado atual (`criticalUnresolved` = Critical ∧ status IN (Open, In Progress))
- [x] T027 [US5] Estender apps/web/src/components/IncidentList.vue com os dois filtros combináveis e criar apps/web/src/components/Dashboard.vue (3 contadores, rótulos em português) integrado em App.vue
  > Nota: contadores renderizados no topo do quadro; filtros/dashboard migrados para KanbanBoard.vue na fatia 006 (T031). Os controles de status e severity são combinados client-side no quadro.

**Checkpoint US5**: Produto completo das 5 fatias. Commit com `npm test` verde.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Fechamento — README como único caminho de bootstrap e validação final.

- [x] T028 Escrever README.md na raiz: pré-requisitos (Node 24+), setup de clone limpo (`npm install`, `npm run seed`, `npm run dev`), `npm test`, variáveis de ambiente COM defaults documentados (PORT, SQLITE_PATH), cenários de aceite por fatia (referência ao quickstart.md); nenhum passo manual fora dele (constituição VII)
- [x] T029 Remover artefatos do scaffold superados (apps/api/dist/, apps/web/dist/, tsconfig .tsbuildinfo) e conferir docker-compose.yml/Dockerfiles coerentes com o README (sem regredir o caminho primário npm); correção Docker: remoção dos arquivos Drizzle mortos (index.ts/schema.ts/drizzle.config.ts) que quebravam o build da API e `@types/node` explícito em apps/web (quebrava o build da web no container)
- [x] T030 Executar a validação ponta a ponta completa de quickstart.md em estado de clone limpo (dados novos) e confirmar `npm test` 100% verde; atualizar AI_LOG.md com a conclusão

---

## Phase 9: User Story 6 — Quadro Kanban interativo (fatia 006)

**Goal**: Substituir a listagem linear por um quadro Kanban de três colunas com transição de status inline nos cards e atualização de estado sem recarregar a página (spec 006).

**Independent Test**: No navegador, Critical Open → "→ Resolved" bloqueado com mensagem no card (card não se move); Open → In Progress → Resolved move o card sem reload, com histórico da sessão e contadores atualizados; `npm test` permanece 7/7 verde.

### Implementation for User Story 6

- [x] T031 [US6] Criar apps/web/src/components/KanbanBoard.vue: 3 colunas (Open/In Progress/Resolved) com contadores, cards com destaque por severidade (borda colorida), botões de transição inline desabilitados durante a ação, mensagem de recusa no próprio card, histórico da sessão (`HH:mm — De → Para`), dashboard no topo, filtro de severidade client-side; remove apps/web/src/components/IncidentList.vue
- [x] T032 [US6] Atualizar apps/web/src/App.vue: integrar KanbanBoard; criar incidente e transição no detalhe recarregam o quadro via evento (sem reload de página); abrir detalhe pelo título do card com remontagem fresca do componente
- [x] T033 [US6] Corrigir apps/web/src/api.ts: erros da API parseados de `{ error }` (mensagem limpa, nunca JSON cru); transitionIncident retorna o incidente atualizado para a atualização local do quadro
- [x] T034 [US6] Validar no navegador via containers Docker: bloqueio Critical com mensagem; sequência completa movendo o card; contadores e dashboard consistentes; build web/API verdes e `npm test` 7/7

**Checkpoint US6**: Quadro Kanban operando de ponta a ponta em http://localhost:8080. Suíte completa verde.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — começa imediatamente
- **Foundational (Phase 2)**: depende da Phase 1 — BLOQUEIA todas as stories
- **US1 (Phase 3)**: depende da Phase 2 — MVP
- **US2 (Phase 4)**: depende da US1 (listagem e bootstrap existirem)
- **US3 (Phase 5)**: depende da Phase 2 (independente da US2 no código, mas a ordem constitucional é sequencial)
- **US4 (Phase 6)**: depende da US3 (consome a função pura) e da US2 (incidentes criáveis em teste)
- **US5 (Phase 7)**: depende da US4 (transições para validar contadores)
- **Polish (Phase 8)**: depende de todas as stories completas

### User Story Dependencies

- **US1**: Phase 2 pronta
- **US2**: US1 pronta
- **US3**: Phase 2 pronta (matriz não toca em nada da US1/US2)
- **US4**: US2 + US3 prontas
- **US5**: US4 pronta

### Within Each User Story

- Testes primeiro (vermelho) → implementação → verde → commit
- Modelos/infra antes de rotas; rotas antes de UI
- **Constituição**: UMA task por vez; antes de cada commit rodar a suíte COMPLETA; ao quebrar algo, reverter ao último commit bom em vez de empilhar correções

### Parallel Opportunities

- Marcadores [P] indicam tasks em arquivos distintos sem dependência entre si (ex.: T006/T007/T008 podem ser escritas juntas). **Execução permanece sequencial** por mandamento constitucional (uma task por vez, diff pequeno).

---

## Parallel Example: User Story 1

```bash
# Escrever os testes da US1 (falham antes da implementação):
Task: "T006 list.test.ts"  → depois T007 seed.test.ts → T008 persistence.test.ts
# Depois a implementação, na ordem:
Task: "T009 seed.ts" → "T010 server.ts + routes" → "T011 UI lista"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) + Phase 2 (Foundational)
2. Phase 3 (US1) → **STOP e VALIDAR** quickstart cenários 001
3. MVP demonstrável: fundação + seed + listagem

### Incremental Delivery (ordem constitucional: sequencial)

1. Setup + Foundational → fundação pronta
2. US1 → validar → commit (MVP!)
3. US2 → validar → commit
4. US3 → matriz verde → commit
5. US4 → validar (incl. US3 verde) → commit
6. US5 → validar números do dashboard → commit
7. Polish → README + validação final ponta a ponta

Cada story entrega valor sem quebrar as anteriores; suíte completa verde a cada commit.

---

## Notes

- [P] = arquivos distintos, sem dependência; execução ainda é uma task por vez (constituição)
- [US*] mapeia para a fatia correspondente (US1=fatia 001 … US5=fatia 005)
- Suíte da US3 (matriz) DEVE permanecer verde ao final da US4 e de tudo (spec 004 FR-008)
- Interações relevantes durante a implementação → AI_LOG.md no momento em que acontecem (constituição VIII)
- Emendas ao plano exigem registro no PLAN.md/spec com motivo e verificação de testes (constituição VIII)
