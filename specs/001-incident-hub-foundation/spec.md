# Feature Specification: Fundação do Incident Hub

**Feature Branch**: `001-incident-hub-foundation`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Fundação do Incident Hub: aplicação web local para registrar incidentes operacionais, sem autenticação, ambiente único compartilhado. Esta fatia entrega modelo de dados persistido, seed de exemplo e listagem."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualizar a lista de incidentes com dados de exemplo (Priority: P1)

Uma pessoa abre a aplicação em um clone limpo e vê, seguindo apenas as
instruções do README, a lista de incidentes operacionais já populada pelo seed
de exemplo. Para cada incidente, a lista exibe **título, severidade,
responsável e status**. Os três incidentes do seed aparecem com os status
corretos: "Payment API instability" (Critical, Ana, Open), "Reconciliation
delay" (High, Bruno, In Progress) e "Incorrect customer notification" (Medium,
Carla, Resolved).

**Why this priority**: É o núcleo da fatia — sem a lista visível com dados
reais, nada mais da aplicação tem valor demonstrável. Todas as fatias futuras
(criação, transição, dashboard) partem desta base.

**Independent Test**: Executar o bootstrap documentado no README em um clone
limpo, abrir a aplicação e verificar que a lista mostra exatamente os três
incidentes do seed com os atributos e status corretos.

**Acceptance Scenarios**:

1. **Given** um clone limpo do repositório, **When** a pessoa segue apenas o
   README para subir a aplicação e abre a listagem, **Then** os três incidentes
   do seed aparecem com título, severidade, responsável e status corretos.
2. **Given** o seed já foi executado uma vez com sucesso, **When** o seed é
   executado novamente, **Then** o total de incidentes permanece três — nenhum
   registro é duplicado e nenhum dado existente é alterado.

---

### User Story 2 - Dados que sobrevivem ao reinício (Priority: P2)

Uma pessoa usa a aplicação, fecha o processo e o inicia novamente. Os incidentes
registrados na persistência continuam lá, exatamente como estavam — a
persistência não depende da sessão do navegador nem do tempo de vida do
processo.

**Why this priority**: A aplicação existe para manter um registro confiável de
incidentes; se os dados somem ao reiniciar, a listagem é apenas um mock. Este
requisito diferencia persistência real de estado em memória.

**Independent Test**: Subir a aplicação, confirmar os incidentes visíveis,
encerrar o processo, iniciar novamente e verificar que os mesmos incidentes
continuam listados sem reexecutar o seed.

**Acceptance Scenarios**:

1. **Given** a aplicação em execução com os três incidentes do seed visíveis,
   **When** o processo é encerrado e iniciado novamente, **Then** a listagem
   mostra os mesmos três incidentes, sem necessidade de reexecutar o seed.
2. **Given** a aplicação em execução, **When** a página é recarregada, **Then**
   os dados continuam os mesmos (o refresh não é o mecanismo de persistência).

---

### User Story 3 - Estado vazio compreensível (Priority: P3)

Quando a persistência não contém nenhum incidente (por exemplo, um ambiente
inicializado sem o seed), a listagem apresenta um estado vazio claro — uma
mensagem compreensível indicando que não há incidentes registrados — em vez de
erro em branco, quebra de layout ou stack trace.

**Why this priority**: Protege a experiência em ambientes recém-criados e
evita que a ausência de dados seja confundida com falha da aplicação. É
importante, mas só se manifesta quando os dados do seed não estão presentes.

**Independent Test**: Iniciar a aplicação com a persistência vazia (sem seed) e
verificar que a listagem exibe uma mensagem de estado vazio legível, sem erro.

**Acceptance Scenarios**:

1. **Given** a persistência sem nenhum incidente, **When** a pessoa abre a
   listagem, **Then** uma mensagem de estado vazio compreensível é exibida,
   sem erro e sem conteúdo quebrado.

---

### Edge Cases

- Executar o seed duas (ou mais) vezes seguidas: o resultado é o mesmo
  conjunto de três incidentes, sem duplicatas e sem sobrescrever dados.
- Abrir a listagem com a persistência vazia: mensagem de estado vazio, não
  erro.
- Encerrar o processo abruptamente durante o uso: ao reiniciar, os dados já
  gravados continuam íntegros e visíveis.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A aplicação MUST exibir a lista de incidentes mostrando, para
  cada incidente, título, severidade, responsável e status.
- **FR-002**: A aplicação MUST apresentar um estado vazio compreensível quando
  não houver incidentes registrados — a lista vazia nunca aparece como erro.
- **FR-003**: A aplicação MUST incluir o modelo de dados persistido das
  entidades **Incident** (id, title, description, severity, owner, status,
  createdAt, updatedAt) e **StatusChange** (id, incidentId, fromStatus,
  toStatus, changedAt).
- **FR-004**: A entidade StatusChange MUST ser somente-adição: uma vez gravado,
  um registro nunca é alterado nem removido. Nesta fatia, nenhum fluxo de
  usuário gera registros de histórico.
- **FR-005**: O seed MUST gravar diretamente na persistência os três incidentes
  de exemplo com o status indicado — "Payment API instability" (Critical, Ana,
  Open), "Reconciliation delay" (High, Bruno, In Progress), "Incorrect customer
  notification" (Medium, Carla, Resolved) — sem passar pelo fluxo de criação e
  sem gerar registros de StatusChange.
- **FR-006**: O seed MUST ser idempotente: executá-lo mais de uma vez não
  duplica registros nem altera os dados existentes.
- **FR-007**: Os dados MUST sobreviver ao reinício do processo, não apenas ao
  refresh da página.
- **FR-008**: A aplicação MUST subir em um clone limpo, em outra máquina,
  seguindo apenas o README — nenhum passo manual não documentado é necessário.

### Key Entities *(include if feature involves data)*

- **Incident**: representa um incidente operacional. Atributos: id,
  title, description, severity (Low, Medium, High, Critical), owner, status
  (Open, In Progress, Resolved), createdAt, updatedAt. Nesta fatia os incidentes
  originam-se apenas do seed; campos como id, createdAt e updatedAt são
  atribuídos automaticamente pelo sistema.
- **StatusChange**: registro de histórico de mudança de status de um incidente.
  Atributos: id, incidentId, fromStatus, toStatus, changedAt. Somente-adição —
  nunca alterado nem removido. Nesta fatia o modelo existe e é persistível, mas
  nenhum fluxo grava registros nele (o seed não gera histórico).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em um clone limpo, seguindo apenas o README, a aplicação sobe e a
  lista exibe 100% dos três incidentes do seed com severidade, responsável e
  status corretos.
- **SC-002**: Após encerrar e reiniciar o processo, os mesmos três incidentes
  permanecem listados sem reexecutar o seed (0 registros perdidos).
- **SC-003**: Após executar o seed duas ou mais vezes, o total de incidentes
  permanece exatamente 3 (0 duplicatas).
- **SC-004**: Com a persistência vazia, a listagem exibe mensagem de estado
  vazio compreensível em 100% das tentativas, sem erro visível.
- **SC-005**: Toda alteração indevida é impossível por construção nesta fatia:
  nenhum registro de StatusChange é criado, alterado ou removido por qualquer
  fluxo entregue aqui.

## Out of Scope (desta fatia)

Criação de incidentes, filtros, tela de detalhe, transição de status e
dashboard não fazem parte desta spec e serão entregues em fatias futuras.

## Assumptions

- Ambiente único e compartilhado, sem autenticação nem permissões — qualquer
  pessoa com acesso à aplicação vê a mesma lista (conforme constituição do
  projeto).
- O seed executa como parte do bootstrap da aplicação ou por comando
  documentado no README; em qualquer caso, é idempotente.
- A lista não exige ordenação específica nesta fatia; qualquer ordem
  determinística e estável é aceitável.
- Os textos da interface (incluindo a mensagem de estado vazio) estão em
  português.
- Timestamps (createdAt, updatedAt, changedAt) são atribuídos automaticamente
  pelo sistema; a exibição precisa deles não é exigida nesta fatia.
- A apresentação dos dados (layout visual, agrupamentos, cores por severidade)
  não é especificada; o requisito é que os quatro atributos do FR-001 sejam
  legíveis e corretos.
