# AI_LOG.md

Registro de interações relevantes com IA, no momento em que acontecem
(Princípio VIII da constituição).

## 2026-09-05 (tarde)

- **$speckit-plan (conjunto)** — Plano conjunto das fatias 001–005 criado em
  `specs/000-project-plan/` (decisão do usuário; `feature.json` apontado para
  lá). Artefatos: `plan.md`, `research.md` (10 decisões), `data-model.md`,
  `contracts/api.md`, `quickstart.md`. Achados relevantes do scaffold
  existente: enum de status `investigating` divergente das specs; criação
  aceitando só title com defaults silenciosos; `better-sqlite3` = módulo
  nativo, **proibido pela constituição** — decisão R1: substituir por
  `node:sqlite` (padrão do Node 24; verificado funcional no runtime v24.19),
  remover também drizzle-orm/drizzle-kit/@fastify/cors; testes com `node:test`
  (zero dependência nova). Constitution Check: GATE PASS com remediação VII
  incorporada como primeira task da fatia 001. Re-check pós-design: PASS.
  Sequenciamento definido: 001 (com remediação) → 002 → 003 → 004 → 005, uma
  fatia por vez, suíte verde a cada commit.
- **$speckit-tasks (conjunto)** — tasks.md gerado em `specs/000-project-plan/`
  (30 tasks, T001–T030, em 8 fases). Fases: Setup (remediação VII + scripts),
  Foundational (node:sqlite, constants, helpers de teste), US1–US5 (= fatias
  001–005, testes antes de implementação em cada uma) e Polish (README +
  quickstart ponta a ponta). Observação de processo: setup-tasks.ps1 exigia
  spec.md no diretório da feature — criada spec-índice em 000-project-plan
  agregando as user stories normativas das 5 fatias (conteúdo normativo
  permanece nas specs 001–005).

## 2026-09-05

- **$speckit-constitution** — Constituição ratificada em
  `.specify/memory/constitution.md` (v1.0.0, ratificação inicial). Scaffold do
  template preenchido com os princípios fornecidos pelo usuário. Observação de
  ambiente: o resolvedor de templates do Spec Kit falhou porque `python3`
  aponta para o atalho quebrado da Microsoft Store; contornado com shim
  temporário em `/tmp/pyshim` apontando para o Python 3.14 real
  (`AppData\Local\Python\bin\python.exe`, com PyYAML). Nenhum arquivo do
  projeto foi alterado por esse contorno.
- **$speckit-specify** — Spec "Fundação do Incident Hub" criada em
  `specs/001-incident-hub-foundation/spec.md`. Fatia: modelo de dados
  persistido (Incident + StatusChange somente-adição), seed idempotente de 3
  incidentes, listagem (título, severidade, responsável, status), estado vazio
  compreensível, dados sobrevivem ao reinício. Checklist de qualidade
  (`checklists/requirements.md`) 100% na primeira iteração; nenhum
  [NEEDS CLARIFICATION]. Fora de escopo: criação, filtros, detalhe, transição
  de status, dashboard. Alinhada à constituição: sem autenticação, escopo
  fechado, portabilidade via README.
- **$speckit-specify (002)** — Spec "Criação de Incidente" criada em
  `specs/002-incident-creation/spec.md`. Fatia: criação com title, description,
  severity e owner obrigatórios e não vazios; id/status(Open)/createdAt/
  updatedAt definidos pelo sistema; valores de id, status e createdAt enviados
  pelo usuário ignorados (inclusive status Resolved); criação não gera
  StatusChange; rejeição com mensagem que nomeia o campo; sobrevive ao
  reinício. Checklist 100% na primeira iteração. Fora de escopo: edição e
  exclusão (permanente), transição, detalhe, filtros, dashboard.
- **$speckit-specify (003)** — Spec "Regra de Transição de Status (Domínio
  Puro)" criada em `specs/003-status-transition-rules/spec.md`. Fatia: função
  pura (severity, statusAtual, statusDestino → permitido | recusado com
  motivo legível), sem banco/rede/relógio/framework/histórico, em um único
  arquivo. Matriz explícita de 36 combinações (12 recusas mesmo-status + 1
  recusa Critical Open→Resolved + 23 permitidas) com casos-âncora; testes
  unitários cobrindo a matriz inteira. Fora de escopo: aplicar a regra a
  incidente real, persistir ou exibir na UI. Checklist 100% na primeira
  iteração.
- **$speckit-specify (004)** — Spec "Alteração de Status, Histórico Persistido
  e Tela de Detalhe" criada em `specs/004-status-change-detail/spec.md`. Fatia:
  transição de status consumindo a função pura da 003 (proibido
  reimplementar/duplicar); aceita = status + updatedAt + exatamente 1 registro
  de histórico; recusada = nada alterado, 0 registros, mensagem com motivo;
  tela de detalhe com os 8 campos e histórico em ordem cronológica; "não
  encontrado" específico; suíte da 003 deve permanecer verde. Aceite cobre os
  5 cenários fornecidos + somente-adição + histórico vazio do seed. Fora de
  escopo: filtros e dashboard. Checklist 100% na primeira iteração.
- **$speckit-specify (005)** — Spec "Filtros de Lista e Dashboard Resumido"
  criada em `specs/005-filters-dashboard/spec.md`. Fatia: filtros por status e
  severity combináveis (interseção), sem filtro = todos, valor inválido
  rejeitado ou ignorado explicitamente; dashboard com 3 contadores (abertos =
  Open; Critical não resolvidos = Critical ∧ (Open ∨ In Progress) — incluir
  In Progress é NON-NEGOTIABLE; resolvidos = Resolved). Aceite numérico
  conferido contra o seed: 1/1/1 → 0 abertos e 1 critical após
  Open→In Progress → 0 critical e 2 resolvidos após Resolved. Fora de escopo:
  ordenação, busca textual, paginação, contagem por severidade. Checklist 100%
  na primeira iteração.
