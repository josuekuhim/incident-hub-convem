# Feature Specification: Criação de Incidente no Incident Hub

**Feature Branch**: `002-incident-creation`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Criação de incidente no Incident Hub. Usuário informa title, description, severity e owner. Todos obrigatórios e não vazios. Sistema define id, status igual a Open, createdAt igual a agora e updatedAt igual a agora. id, status e createdAt enviados pelo usuário são ignorados. A criação não gera registro de histórico."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar um novo incidente (Priority: P1)

Uma pessoa que observa um problema operacional registra um novo incidente
informando quatro dados: **título, descrição, severidade e responsável**. Ao
concluir com sucesso, o incidente aparece na listagem com status **Open** — é
assim que todo incidente nasce, independentemente do que tenha sido informado
em outros campos. O sistema se encarrega dos demais atributos: identificador,
status inicial e as duas datas/horas (criação e última atualização) são
definidos automaticamente.

**Why this priority**: Sem criação, o Incident Hub depende exclusivamente do
seed — a aplicação não cumpre seu propósito de registrar incidentes do mundo
real. É o núcleo desta fatia.

**Independent Test**: Preencher os quatro campos obrigatórios com valores
válidos, concluir a criação e verificar que o incidente aparece na lista com
status Open e os dados informados.

**Acceptance Scenarios**:

1. **Given** a aplicação em execução, **When** a pessoa cria um incidente
   informando título, descrição, severidade e responsável válidos, **Then** a
   operação retorna sucesso e o incidente aparece na listagem com status Open,
   além do título, severidade e responsável informados.
2. **Given** a criação concluída com sucesso, **When** a pessoa recarrega a
   página ou reinicia o processo da aplicação, **Then** o incidente criado
   continua listado (a criação grava em persistência, não apenas em memória).
3. **Given** um incidente recém-criado, **When** a listagem ou os dados
   persistidos são examinados, **Then** o status é Open e **nenhum** registro
   de histórico (StatusChange) foi gerado pela criação.
4. **Given** uma requisição de criação que inclui id, status ou data/hora de
   criação preenchidos pelo usuário, **When** o sistema processa a criação,
   **Then** esses valores são ignorados: o id e as datas/horas são definidos
   pelo sistema e o status é Open — mesmo que o status informado seja
   "Resolved".

---

### User Story 2 - Rejeição clara de dados inválidos (Priority: P2)

Quando a pessoa tenta criar um incidente com dados inválidos — campo
obrigatório ausente ou vazio, ou severidade fora das quatro valores aceitos
(Low, Medium, High, Critical) — a operação **não é concluída** e a pessoa
recebe uma mensagem compreensível que indica exatamente qual campo está com
problema. Nada é gravado, a lista permanece intacta e nenhuma mensagem de erro
técnica (stack trace) aparece.

**Why this priority**: Garante a integridade do registro de incidentes e a
Princípio VI da constituição (falhas explícitas): sem isso, dados ruins entram
na base silenciosamente ou falhas acontecem sem explicação. É o que torna a
criação confiável.

**Independent Test**: Tentar criar incidentes omitindo cada um dos quatro
campos, enviando-os vazios, e enviando uma severidade inválida — cada tentativa
deve ser rejeitada com mensagem que nomeia o campo, sem alterar a lista.

**Acceptance Scenarios**:

1. **Given** o formulário (ou requisição) de criação, **When** o título está
   ausente ou vazio, **Then** a criação é rejeitada com mensagem que indica o
   campo título — e o mesmo vale, individualmente, para descrição,
   severidade e responsável.
2. **Given** uma severidade que não pertence ao conjunto Low, Medium, High,
   Critical, **When** a criação é tentada, **Then** ela é rejeitada com
   mensagem que indica o campo severidade.
3. **Given** qualquer tentativa de criação rejeitada, **When** a listagem é
   consultada em seguida, **Then** nenhum incidente parcial foi gravado — a
   lista permanece exatamente como estava.

---

### Edge Cases

- Campos enviados apenas com espaços em branco são tratados como vazios
  (rejeitados com mensagem indicando o campo).
- Requisição de criação sem nenhum campo: rejeitada com as mensagens dos
  campos faltantes, não com erro genérico ou silêncio.
- Envio de status "Resolved" (ou qualquer outro status) na criação: ignorado;
  o incidente nasce Open. A criação nunca burla o status inicial.
- Envio de id duplicado ou arbitrário na criação: ignorado; o id é sempre
  definido pelo sistema.
- Reinício do processo imediatamente após uma criação bem-sucedida: o
  incidente persiste.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir a criação de um incidente a partir de
  quatro campos informados pelo usuário: title, description, severity e owner.
- **FR-002**: Os quatro campos do FR-001 são obrigatórios e não vazios: o
  sistema MUST rejeitar a criação quando qualquer um deles estiver ausente ou
  vazio, com mensagem que **indica o campo** problemático.
- **FR-003**: O sistema MUST aceitar apenas as severidades Low, Medium, High e
  Critical; severidade fora desse conjunto MUST ser rejeitada com mensagem
  indicando o campo severidade.
- **FR-004**: O sistema MUST definir automaticamente, na criação: o id do
  incidente, o status igual a **Open**, createdAt igual ao momento da criação e
  updatedAt igual ao momento da criação.
- **FR-005**: Valores de id, status e createdAt enviados pelo usuário MUST ser
  **ignorados** — inclusive status "Resolved" ou qualquer outro status
  informado na criação; o incidente sempre nasce Open.
- **FR-006**: A criação MUST gravar o incidente na persistência: ele aparece na
  listagem e sobrevive ao reinício do processo.
- **FR-007**: A criação MUST **não** gerar nenhum registro de histórico
  (StatusChange) — nascer com status Open não é uma mudança de status.
- **FR-008**: Toda rejeição (campo ausente, campo vazio, severidade inválida)
  MUST retornar mensagem compreensível para o usuário final indicando o campo,
  nunca stack trace, nunca sucesso silencioso, e nunca gravar dados parciais.

### Key Entities *(include if feature involves data)*

- **Incident**: entidade criada por esta fatia. Atributos informados pelo
  usuário: title, description, severity (Low, Medium, High, Critical), owner.
  Atributos definidos pelo sistema: id, status (nasce Open), createdAt,
  updatedAt. Relaciona-se com StatusChange por incidentId (sem registros gerados
  nesta fatia).
- **StatusChange**: não recebe registros nesta fatia; permanece somente-adição
  conforme a constituição e a fatia 001.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das criações com os quatro campos válidos resultam em
  sucesso, com o incidente visível na lista como Open.
- **SC-002**: 100% das tentativas com um campo obrigatório ausente ou vazio são
  rejeitadas com mensagem que nomeia o campo (4 campos × ausente/vazio = 8
  casos, todos cobertos).
- **SC-003**: 100% das tentativas com severidade fora do enum são rejeitadas
  com mensagem indicando o campo severidade.
- **SC-004**: Em 100% das criações — inclusive as que enviam status "Resolved"
  — o incidente nasce com status Open, id definido pelo sistema e nenhum
  registro de StatusChange gerado.
- **SC-005**: Incidentes criados permanecem listados após reinício do processo
  (0 registros perdidos).
- **SC-006**: Nenhuma tentativa rejeitada altera a listagem ou a persistência
  (0 gravações parciais).

## Out of Scope (desta fatia)

Edição e exclusão de incidente não fazem parte desta spec e **não serão
implementadas em nenhuma fatia** (fora de escopo permanente pela constituição).
Transição de status, detalhe do incidente, filtros e dashboard continuam fora
desta fatia, entregues em fatias futuras próprias.

## Assumptions

- A criação acontece pela interface da aplicação e/ou pela interface de
  programação exposta pela aplicação; os requisitos de validação valem para
  ambas (a validação não pode ser burlada pulando a UI).
- "Vazio" inclui string vazia e conteúdo apenas com espaços em branco.
- Mensagens de rejeição são em português e nomeiam o campo em linguagem
  compreensível (ex.: "Informe o título do incidente"), não códigos técnicos.
- O id é único entre todos os incidentes; o formato específico (numérico,
  texto, etc.) é decisão da fase de planejamento.
- O valor de updatedAt na criação é igual ao createdAt (o incidente acabou de
  ser criado); atualizações desse campo ocorrerão em fatias futuras de
  transição de status.
- A criação de um incidente não altera os incidentes do seed nem qualquer
  outro incidente existente.
