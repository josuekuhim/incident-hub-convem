# Feature Specification: Incident Hub — Plano Conjunto (índice das fatias 001–005)

**Feature Branch**: `000-project-plan`

**Created**: 2026-09-05

**Status**: Approved (plano)

**Input**: Esta é uma spec-índice para o plano conjunto das fatias 001–005.
O conteúdo normativo vive nas specs das fatias; este arquivo apenas as
agrega para geração de tasks e rastreabilidade.

**Specs normativas (fonte de verdade)**:

- [001 — Fundação do Incident Hub](../001-incident-hub-foundation/spec.md)
- [002 — Criação de Incidente](../002-incident-creation/spec.md)
- [003 — Regra de Transição de Status (Domínio Puro)](../003-status-transition-rules/spec.md)
- [004 — Alteração de Status, Histórico e Detalhe](../004-status-change-detail/spec.md)
- [005 — Filtros de Lista e Dashboard](../005-filters-dashboard/spec.md)

## User Scenarios & Testing *(mandatory)*

As user stories abaixo são as histórias primárias (P1) de cada fatia, em ordem
de execução. Os detalhes, cenários de aceitação e casos-âncora estão nas specs
das respectivas fatias.

### User Story 1 - Fundação: modelo persistido, seed e listagem (Priority: P1) — [spec 001]

Aplicação sobe em clone limpo seguindo apenas o README; três incidentes do
seed listados com status corretos; dados sobrevivem ao reinício do processo;
seed idempotente; estado vazio compreensível.

### User Story 2 - Criação de incidente validada (Priority: P1) — [spec 002]

Quatro campos obrigatórios e não vazios; id/status Open/createdAt/updatedAt
definidos pelo sistema; valores enviados pelo usuário ignorados; rejeição com
mensagem nomeando o campo; criação não gera histórico; sobrevive ao reinício.

### User Story 3 - Regra de transição como função pura (Priority: P1) — [spec 003]

Função pura (severity, statusAtual, statusDestino → permitido | recusado com
motivo legível), sem I/O, em arquivo único; matriz 4×3×3 explícita; testes
unitários cobrindo as 36 combinações.

### User Story 4 - Transição persistida e tela de detalhe (Priority: P1) — [spec 004]

Transição via função pura da fatia 003 (sem reimplementação); aceita = status
+ updatedAt + exatamente 1 registro de histórico; recusada = nada alterado +
mensagem com motivo; detalhe com 8 campos e histórico cronológico; "não
encontrado" específico; suíte da 003 permanece verde.

### User Story 5 - Filtros e dashboard (Priority: P1) — [spec 005]

Filtros status+severity combináveis (interseção); sem filtro = todos; valor
inválido rejeitado explicitamente; dashboard com 3 contadores — Critical não
resolvidos inclui In Progress (NON-NEGOTIABLE).

## Requirements *(mandatory)*

Ver requisitos funcionais (FR) completos em cada spec de fatia. Nenhum
requisito adicional é introduzido por esta spec-índice.

## Success Criteria *(mandatory)*

Os critérios de sucesso (SC) de cada fatia, aplicados na ordem de execução
001→005, constituem o aceite do projeto. Validação ponta a ponta:
[quickstart.md](quickstart.md).

## Assumptions

- Execução uma fatia por vez, suíte completa verde a cada commit
  (constituição: Fluxo de Trabalho).
- Decisões técnicas: [plan.md](plan.md) e [research.md](research.md).
