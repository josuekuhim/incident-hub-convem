# Feature Specification: Alteração de Status, Histórico Persistido e Tela de Detalhe

**Feature Branch**: `004-status-change-detail`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Alteração de status, histórico persistido e tela de detalhe. Usa a função pura de transição já implementada na fatia 003. A regra não deve ser reimplementada, duplicada nem reescrita em rota ou componente."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Alterar o status de um incidente com histórico (Priority: P1)

Uma pessoa responsável por acompanhar um incidente muda o status dele (ex.: de
Open para In Progress). Quando a mudança é aceita, **exatamente três coisas**
acontecem juntas: o status passa a ser o novo, a data/hora de última atualização
(updatedAt) passa a ser o momento da mudança, e **exatamente um** registro de
histórico é criado contendo o status anterior, o novo status e a data/hora da
mudança. Nada mais é alterado.

Quando a mudança é **recusada** pela regra de transição — destino igual ao
status atual, ou Critical indo de Open direto para Resolved — **nada muda**:
status e updatedAt permanecem intactos, nenhum registro de histórico é criado,
e a pessoa recebe uma mensagem compreensível explicando o motivo da recusa
(incluindo, no caso do Critical, que é preciso passar por In Progress antes de
Resolver). A recusa nunca aparece como sucesso nem como erro genérico.

**Why this priority**: É o fluxo central do produto — transformar a listagem
estática em um registro vivo de incidentes, com trilha de auditoria
somente-adição exigida pela constituição (Princípio IV).

**Independent Test**: A partir de um incidente conhecido, solicitar uma
transição aceita e uma recusada e verificar, respectivamente: os três efeitos
exatos da aceitação (status, updatedAt, um registro de histórico) e a
integridade total após a recusa (nada alterado, nada criado, mensagem com
motivo).

**Acceptance Scenarios**:

1. **Given** um incidente Critical em Open, **When** uma mudança direta para
   Resolved é tentada, **Then** a operação é recusada com mensagem que indica
   a necessidade de passar por In Progress — e o incidente permanece em Open,
   com o updatedAt anterior e nenhum registro de histórico criado.
2. **Given** um incidente Critical em Open, **When** ele é movido para In
   Progress e depois para Resolved (duas transições aceitas), **Then** exatamente
   dois registros de histórico existem, na ordem cronológica correta
   (Open→In Progress primeiro, In Progress→Resolved depois).
3. **Given** um incidente High em Open, **When** uma mudança direta para
   Resolved é tentada, **Then** a operação é aceita e exatamente um registro de
   histórico é criado (Open→Resolved).
4. **Given** uma transição recusada por qualquer motivo, **When** o incidente é
   consultado, **Then** updatedAt é exatamente o mesmo de antes da tentativa.
5. **Given** um incidente com histórico registrado, **When** o processo da
   aplicação é encerrado e iniciado novamente, **Then** o status atual e todo o
   histórico continuam presentes e idênticos.
6. **Given** qualquer transição aceita, **When** o número de registros de
   histórico do incidente é contado antes e depois, **Then** exatamente um
   registro foi acrescentado — nenhum registro anterior foi alterado ou
   removido.

---

### User Story 2 - Consultar o detalhe completo de um incidente (Priority: P2)

Uma pessoa que precisa entender a situação de um incidente abre a tela de
detalhe dele a partir da listagem. A tela mostra **todos os dados** do
incidente — título, descrição, severidade, responsável, status atual, data/hora
de criação e data/hora de última atualização — seguidos do **histórico de
mudanças de status em ordem cronológica** (da mais antiga para a mais recente).

Quando o incidente consultado não existe, a pessoa recebe um claro
**"não encontrado"** — nunca um erro genérico, nunca uma tela quebrada, nunca
stack trace.

**Why this priority**: O histórico só tem valor se for visível; a tela de
detalhe é onde a trilha de auditoria se torna útil para quem opera. Depende da
User Story 1 para ter conteúdo, mas entrega valor imediato para os dados já
existentes (seed).

**Independent Test**: Abrir o detalhe de um incidente conhecido e conferir os
oito campos exibidos e a ordem do histórico; consultar um identificador
inexistente e verificar a mensagem específica de não encontrado.

**Acceptance Scenarios**:

1. **Given** um incidente existente, **When** a tela de detalhe é aberta,
   **Then** title, description, severity, owner, status, createdAt, updatedAt
   e o histórico completo são exibidos corretamente.
2. **Given** um incidente com dois ou mais registros de histórico, **When** o
   detalhe é aberto, **Then** os registros aparecem em ordem cronológica — o
   mais antigo primeiro.
3. **Given** um incidente sem nenhum registro de histórico (ex.: incidentes do
   seed), **When** o detalhe é aberto, **Then** a área de histórico indica de
   forma compreensível que não há mudanças de status registradas — não é erro.
4. **Given** um identificador que não corresponde a nenhum incidente, **When**
   o detalhe é solicitado, **Then** a resposta é um erro específico de
   "não encontrado", não um erro genérico nem silêncio.

---

### Edge Cases

- Tentativa de transição para o mesmo status atual: recusada com motivo
  legível; nada é alterado, nenhum histórico é criado.
- Transição recusada seguida de transição aceita no mesmo incidente: apenas a
  aceita gera registro — a recusada não deixa rastro (nem registro, nem
  alteração de updatedAt).
- Histórico somente-adição sob tentativas repetidas: nenhuma operação desta
  fatia altera ou remove registros anteriores, apenas acrescenta.
- Reinício do processo logo após uma transição aceita: status, updatedAt e o
  histórico completo sobrevivem.
- Detalhe de incidente do seed (sem histórico): exibido normalmente, com a
  indicação de histórico vazio.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST alterar o status de um incidente usando
  **exclusivamente** a função pura de transição da fatia 003 — a regra não
  pode ser reimplementada, duplicada nem reescrita em rota, componente ou
  qualquer outro módulo.
- **FR-002**: Toda transição aceita MUST, atomicamente: atualizar o status do
  incidente para o novo status, atualizar updatedAt para o momento da
  operação e criar **exatamente um** registro de histórico contendo o status
  anterior, o novo status e a data/hora da mudança.
- **FR-003**: Toda transição recusada MUST deixar os dados intactos: status e
  updatedAt permanecem os mesmos, **nenhum** registro de histórico é criado, e
  a pessoa recebe mensagem compreensível com o motivo da recusa.
- **FR-004**: O histórico MUST ser somente-adição: registros existentes nunca
  são alterados nem removidos por operação alguma desta fatia (constituição,
  Princípio IV).
- **FR-005**: O status atualizado, o updatedAt atualizado e o novo registro de
  histórico MUST sobreviver ao reinício do processo da aplicação.
- **FR-006**: O sistema MUST oferecer uma tela de detalhe do incidente exibindo
  title, description, severity, owner, status, createdAt, updatedAt e o
  histórico de mudanças de status em **ordem cronológica** (mais antigo
  primeiro).
- **FR-007**: Consulta a um identificador inexistente MUST retornar erro
  específico de "não encontrado", compreensível — nunca erro genérico, nunca
  stack trace.
- **FR-008**: A suíte de testes da fatia 003 (matriz de transições) MUST
  continuar verde ao final desta fatia — nenhum teste existente pode quebrar
  (constituição, Princípio V e Fluxo de Trabalho).

### Key Entities *(include if feature involves data)*

- **Incident**: passa a ter o status mutável via transições validadas; updatedAt
  passa a refletir a última mudança aceita. Demais atributos inalteráveis nesta
  fatia (edição/exclusão estão fora de escopo permanente).
- **StatusChange**: passa a receber registros, sempre somente-adição. Atributos:
  id, incidentId (referência ao incidente), fromStatus (status anterior),
  toStatus (novo status), changedAt (data/hora da mudança). Nunca alterado nem
  removido. Nenhum registro é criado pela criação de incidente ou pelo seed —
  apenas por transições aceitas.
- **Regra de transição (fatia 003)**: consumida como é; permanece função pura,
  em seu arquivo único, sem ganhar dependências.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Critical em Open → Resolved é recusado em 100% das tentativas,
  com mensagem indicando a passagem por In Progress, e em 0% das tentativas
  altera status/updatedAt ou cria histórico.
- **SC-002**: Critical em Open → In Progress → Resolved produz exatamente 2
  registros de histórico, na ordem cronológica correta (0 extras, 0 faltantes).
- **SC-003**: High em Open → Resolved produz exatamente 1 registro de histórico.
- **SC-004**: 100% das transições recusadas deixam updatedAt idêntico ao
  anterior (0 alterações) e criam 0 registros.
- **SC-005**: Após reinício do processo, 100% das transições aceitas e seus
  registros de histórico permanecem consultáveis no detalhe, em ordem correta
  (0 perdas).
- **SC-006**: A tela de detalhe exibe os 8 campos exigidos em 100% dos
  incidentes existentes, e identificadores inexistentes retornam "não
  encontrado" em 100% das consultas (0 erros genéricos).
- **SC-007**: A suíte de testes da fatia 003 termina 100% verde ao final desta
  fatia (0 testes quebrados ou ignorados).

## Out of Scope (desta fatia)

Filtros e dashboard não fazem parte desta spec (fatias futuras). Permanecem
fora de escopo permanente: edição e exclusão de incidente, autenticação,
permissões, multi-tenant, busca textual, paginação e deploy público.

## Assumptions

- A escolha do novo status pelo usuário é feita a partir dos três valores
  válidos (Open, In Progress, Resolved); a validação de entradas inválidas
  (status ou severidade fora dos conjuntos) segue o padrão da fatia de criação
  (rejeição com mensagem indicando o campo).
- Incidentes do seed (sem histórico) podem ser transicionados normalmente; a
  regra usa o status atual persistido do incidente, não o histórico.
- A forma de solicitar a transição (controle na tela de detalhe, ação na
  listagem, ou ambos) e o texto exato das mensagens são decisões da fase de
  planejamento/implementação; o requisito é o comportamento (mensagem
  compreensível com o motivo, em português).
- As três operações da transição aceita (status, updatedAt, registro de
  histórico) são indivisíveis do ponto de vista do observador: nunca é possível
  ver o status novo sem o registro de histórico correspondente, nem vice-versa.
- O relógio usado em updatedAt e changedAt é o mesmo momento da operação —
  os dois valores coincidem na mesma transição.
