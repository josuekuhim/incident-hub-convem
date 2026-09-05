# Feature Specification: Quadro Kanban Interativo

**Feature Branch**: `006-kanban-board`

**Created**: 2026-09-05

**Status**: Implemented

**Input**: User description: "poderia fazer um kanban né? e não ficar dependendo de atualizar a página para selecionar os incidentes" — a listagem linear evolui para um quadro Kanban com três colunas (Open, In Progress, Resolved), transição de status inline em cada card e atualização de estado sem recarregar a página.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualizar incidentes em colunas por status (Priority: P1)

Uma pessoa acompanhando os incidentes vê o quadro dividido em **três colunas** —
Open, In Progress e Resolved — cada uma com o **contador** de incidentes da
coluna. Cada incidente aparece como um **card** na coluna do seu status atual,
com título, severidade (destaque visual por cor), responsável e data/hora da
última atualização. Colunas sem incidentes exibem um estado vazio
compreensível ("vazio"), não um erro.

**Why this priority**: É a mudança estrutural da fatia — a visualização por
status é a forma natural de operar incidentes e pré-requisito para as ações
inline.

**Independent Test**: Com os três incidentes do seed, conferir um card por
incidente na coluna correta (Open=1, In Progress=1, Resolved=1) e os
contadores das colunas batendo com o dashboard.

**Acceptance Scenarios**:

1. **Given** os três incidentes do seed, **When** o quadro é exibido, **Then**
   cada incidente aparece na coluna do seu status atual e cada coluna mostra
   seu contador (1/1/1).
2. **Given** uma coluna sem incidentes, **When** o quadro é exibido, **Then**
   a coluna mostra um estado vazio compreensível.
3. **Given** cards no quadro, **When** a severidade é observada, **Then** cada
   card tem destaque visual distinto por severidade (Critical, High, Medium,
   Low).

---

### User Story 2 - Transição de status inline sem recarregar (Priority: P1)

Em cada card, a pessoa vê botões de transição para os **demais** status (ex.:
em Open, os botões "→ In Progress" e "→ Resolved"). Ao clicar, a transição é
enviada à API e, **sem nenhum recarregamento de página**:

- **Transição aceita**: o card se move imediatamente para a coluna de destino,
  os contadores das colunas e do dashboard se atualizam, a data de atualização
  do card muda e a entrada de histórico da sessão (`HH:mm — De → Para`) passa
  a aparecer no card.
- **Transição recusada pela regra de negócio** (ex.: Critical Open →
  Resolved): o card **permanece na coluna original** e a mensagem de motivo da
  API é exibida **no próprio card**, de forma compreensível.

**Why this priority**: É o pedido central do usuário — operar os incidentes
direto no quadro, sem refresh, com feedback imediato e explícito.

**Independent Test**: No card Critical em Open, clicar "→ Resolved" → card fica
em Open e mostra a mensagem da regra; clicar "→ In Progress" → card move sem
reload e acumula `HH:mm — Open → In Progress`; clicar "→ Resolved" → card move
para Resolved e o histórico da sessão mostra as duas entradas.

**Acceptance Scenarios**:

1. **Given** um incidente Critical em Open, **When** "→ Resolved" é clicado,
   **Then** o card permanece em Open e exibe "incidentes Critical precisam
   passar por In Progress antes de serem resolvidos".
2. **Given** o mesmo card, **When** "→ In Progress" é clicado, **Then** o card
   se move para a coluna In Progress sem recarregar a página, os contadores
   atualizam e o histórico da sessão registra a entrada.
3. **Given** o card em In Progress, **When** "→ Resolved" é clicado, **Then**
   o card se move para Resolved, o dashboard passa a contar mais um resolvido
   e o histórico da sessão mostra as duas entradas em ordem.
4. **Given** qualquer transição aceita, **When** a página é recarregada
   depois, **Then** o estado exibido reflete os dados persistidos (a
   atualização otimista nunca diverge do servidor).

---

### User Story 3 - Navegação e criação integradas ao quadro (Priority: P2)

Clicar no **título** de um card abre a **tela de detalhe** do incidente (fatia
004) com o histórico persistido completo. Criar um incidente pelo formulário
(fatia 002) **atualiza o quadro imediatamente** — o novo card aparece na
coluna Open sem recarregar a página. O filtro por severidade é aplicado
instantaneamente sobre os cards visíveis, sem nova consulta à API.

**Why this priority**: Mantém a coesão com as fatias anteriores — detalhe e
criação continuam acessíveis, agora integrados ao fluxo do quadro.

**Independent Test**: Clicar no título de um card → detalhe abre com o
histórico persistido; criar um incidente → card aparece em Open sem reload;
aplicar filtro de severidade → cards filtrados instantaneamente.

**Acceptance Scenarios**:

1. **Given** um card no quadro, **When** seu título é clicado, **Then** a
   tela de detalhe abre com os 8 campos e o histórico persistido cronológico.
2. **Given** o quadro carregado, **When** um incidente é criado pelo
   formulário, **Then** o novo card aparece na coluna Open sem recarregar a
   página.
3. **Given** o filtro de severidade, **When** um valor é selecionado, **Then**
   apenas os cards daquela severidade permanecem visíveis, instantaneamente.

---

### Edge Cases

- Transição recusada: card não se move; mensagem de motivo exibida no card;
  nenhum contador muda.
- Cliques repetidos durante uma transição em andamento: os botões do card
  ficam desabilitados até a resposta, evitando envio duplo.
- Criação enquanto filtro de severidade está ativo: o card aparece somente se
  sua severidade casar com o filtro; os contadores sempre refletem o total.
- API indisponível durante uma ação: mensagem de erro compreensível no card ou
  no topo do quadro; o quadro permanece no último estado conhecido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A aplicação MUST apresentar os incidentes em um quadro com três
  colunas — Open, In Progress, Resolved — posicionando cada card na coluna do
  status atual do incidente.
- **FR-002**: Cada coluna MUST exibir o contador de incidentes nela presentes,
  consistente com os dados carregados.
- **FR-003**: Cada card MUST exibir título, severidade (com destaque visual
  distinto por valor), responsável e data/hora da última atualização.
- **FR-004**: Cada card MUST oferecer ações de transição para os demais
  status, que consomem exclusivamente o endpoint de transição da API (a regra
  de negócio nunca é reimplementada na UI).
- **FR-005**: Transição aceita MUST atualizar a interface sem recarregar a
  página: o card se move para a coluna de destino, contadores (colunas e
  dashboard) e data de atualização refletem o estado retornado pela API.
- **FR-006**: Transição recusada MUST manter o card na coluna original e
  exibir o motivo retornado pela API de forma compreensível, no próprio card.
- **FR-007**: Durante uma transição em andamento, as ações do card MUST ser
  desabilitadas até a conclusão (sucesso ou erro).
- **FR-008**: Clicar no título do card MUST abrir a tela de detalhe do
  incidente (fatia 004) com o histórico persistido.
- **FR-009**: Criar um incidente MUST atualizar o quadro sem recarregar a
  página, posicionando o novo card na coluna Open.
- **FR-010**: O filtro por severidade MUST operar sobre os dados já carregados
  (client-side), sem nova consulta por alteração de filtro.
- **FR-011**: Após recarregar a página, o quadro MUST refletir exatamente o
  estado persistido (0 divergência entre atualização otimista e servidor).

### Key Entities

- **Incident**: lido e atualizado (status/updatedAt) via API — nenhum atributo
  novo criado nesta fatia.
- **StatusChange**: histórico persistido exibido na tela de detalhe; entradas
  da sessão corrente podem ser exibidas no card até o próximo carregamento
  completo (fonte da verdade permanece o servidor).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos incidentes aparecem na coluna correspondente ao seu
  status, com contadores de coluna exatos, em todos os estados testados.
- **SC-002**: 100% das transições aceitas movem o card e atualizam contadores
  sem recarregar a página (0 reloads por ação).
- **SC-003**: 100% das transições recusadas mantêm o card na coluna original e
  exibem o motivo da API (0 mudanças de estado indevidas).
- **SC-004**: A regra Critical Open → Resolved é bloqueada pelo quadro com
  mensagem compreensível em 100% das tentativas.
- **SC-005**: Após recarregar a página, o quadro reflete o estado persistido
  sem divergência em 100% das verificações.
- **SC-006**: A suíte de testes existente (matriz de transições, API e
  dashboard) permanece 100% verde após a mudança de interface.

## Out of Scope (desta fatia)

Drag-and-drop de cards (a transição é por botões explícitos), reordenação
manual dentro da coluna, busca textual, paginação, edição/exclusão de
incidentes, autenticação e multi-tenant.

## Assumptions

- As três colunas correspondem exatamente aos três status do domínio; nenhum
  status novo é introduzido.
- A fonte da verdade é sempre a API: a atualização da interface após uma
  transição usa o incidente retornado pelo servidor (não suposição local).
- Os filtros de status e severity da fatia 005 permanecem disponíveis na API
  e são expostos como controles combináveis no quadro.
- O histórico exibido no card é apenas o da sessão corrente; o histórico
  completo e persistido continua na tela de detalhe.
