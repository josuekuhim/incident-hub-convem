# Feature Specification: Comentários e Timeline Unificada

**Feature Branch**: `007-comments-timeline`

**Created**: 2026-09-05

**Status**: Implemented

**Input**: Change Request #1 (14:00) — "Os usuários precisam conseguir
registrar comentários nos incidentes" e "queremos uma visão cronológica única
da atividade do incidente", reunindo alterações de status e comentários em
ordem cronológica.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar um comentário no incidente (Priority: P1)

A partir da tela de detalhe de um incidente, a pessoa informa **autor** e
**conteúdo** e registra um comentário. O comentário passa a integrar a
atividade do incidente imediatamente, com a **data/hora de criação** registrada
pelo sistema.

Tentativas com autor ou conteúdo vazios — inclusive apenas espaços — são
**recusadas com mensagem que nomeia o campo**, sem gravar nada.

**Why this priority**: É o requisito central do Change Request. Sem ele, nada
mais da mudança existe.

**Independent Test**: No detalhe de um incidente, enviar um comentário válido e
conferir que ele aparece na atividade; enviar autor vazio e conteúdo vazio e
conferir a recusa com mensagem compreensível e nenhum registro criado.

**Acceptance Scenarios**:

1. **Given** um incidente existente, **When** um comentário com autor e
   conteúdo é registrado, **Then** ele é persistido com data/hora de criação
   definida pelo sistema e passa a aparecer na atividade do incidente.
2. **Given** um incidente existente, **When** o conteúdo é vazio ou só espaços,
   **Then** a operação é recusada com mensagem nomeando o campo e nenhum
   comentário é criado.
3. **Given** um incidente existente, **When** o autor é vazio ou só espaços,
   **Then** a operação é recusada com mensagem nomeando o campo e nenhum
   comentário é criado.
4. **Given** um id de incidente inexistente, **When** um comentário é enviado,
   **Then** a resposta é 404 e nenhum comentário é criado.
5. **Given** um incidente, **When** múltiplos comentários são registrados,
   **Then** todos são preservados — comentar nunca substitui um comentário
   anterior.

---

### User Story 2 - Ver a atividade do incidente em uma timeline única (Priority: P1)

A tela de detalhe apresenta uma **timeline cronológica única** reunindo
alterações de status e comentários, distinguindo visualmente os dois tipos:

```text
10:31 — Status alterado: Open → In Progress
10:42 — Ana comentou: "Provider contacted."
11:14 — Status alterado: In Progress → Resolved
```

**Why this priority**: É a segunda metade do Change Request — comentários sem
visão unificada não entregam o que foi pedido.

**Independent Test**: Em um incidente, intercalar transição, comentário e
transição; conferir que a timeline apresenta os três eventos na ordem em que
ocorreram, com o tipo de cada um identificável.

**Acceptance Scenarios**:

1. **Given** um incidente com transições e comentários intercalados, **When** o
   detalhe é aberto, **Then** todos os eventos aparecem em ordem cronológica
   crescente, independentemente do tipo.
2. **Given** a timeline, **When** um evento é observado, **Then** é possível
   distinguir se é alteração de status (status anterior e novo) ou comentário
   (autor e conteúdo).
3. **Given** um incidente sem transições e sem comentários, **When** o detalhe
   é aberto, **Then** a timeline exibe um estado vazio compreensível, não erro.
4. **Given** um incidente apenas com comentários, **When** o detalhe é aberto,
   **Then** a timeline apresenta os comentários normalmente.

---

### User Story 3 - Comentários sobrevivem a reinício (Priority: P1)

Comentários são persistidos como as demais informações da aplicação:
recarregar a página ou reiniciar o processo não os apaga, e a ordem da timeline
permanece a mesma após o reinício.

**Why this priority**: Exigência explícita do §3 do Change Request, e o mesmo
critério já aplicado a incidentes e histórico.

**Independent Test**: Registrar comentário e transição, derrubar o processo do
servidor, subir outro sobre o mesmo banco e conferir que a timeline permanece
íntegra e na mesma ordem.

**Acceptance Scenarios**:

1. **Given** comentários registrados, **When** o processo é reiniciado sobre o
   mesmo banco, **Then** os comentários e sua ordem na timeline permanecem
   inalterados.

---

### Edge Cases

- Autor ou conteúdo compostos apenas de espaços: recusados como vazios; o valor
  gravado é sempre a versão normalizada (trim).
- Comentário em incidente inexistente: 404, sem criação.
- Eventos com o mesmo instante (status e comentário no mesmo milissegundo): a
  ordem é determinística e estável entre requisições, nunca aleatória.
- Incidente sem nenhuma atividade: timeline vazia com mensagem compreensível.
- Comentário **não** altera o status do incidente nem gera registro de
  histórico de status.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Um incidente MUST poder possuir múltiplos comentários.
- **FR-002**: Cada comentário MUST possuir autor, conteúdo e data/hora de
  criação.
- **FR-003**: A data/hora de criação do comentário MUST ser definida pelo
  sistema, ignorando qualquer valor enviado pelo cliente.
- **FR-004**: Autor e conteúdo MUST ser obrigatórios; valores ausentes, vazios
  ou compostos apenas de espaços MUST ser recusados com mensagem nomeando o
  campo, sem persistir nada.
- **FR-005**: Comentar em incidente inexistente MUST retornar 404 sem criar
  registro.
- **FR-006**: Comentários MUST ser persistidos e associados ao incidente
  correspondente, sobrevivendo a reinício do processo.
- **FR-007**: O detalhe do incidente MUST expor uma timeline única contendo
  alterações de status e comentários em ordem cronológica crescente.
- **FR-008**: Cada evento da timeline MUST permitir identificar seu tipo e os
  dados próprios daquele tipo (status anterior/novo, ou autor/conteúdo).
- **FR-009**: A ordenação da timeline MUST ser determinística para eventos de
  mesmo instante — a mesma entrada produz sempre a mesma ordem.
- **FR-010**: Comentar MUST NOT alterar o status do incidente nem criar
  registro no histórico de status.
- **FR-011**: A interface MUST permitir registrar um comentário a partir da
  tela de detalhe do incidente e exibir a recusa de forma compreensível.
- **FR-012**: O contrato existente do detalhe (`history`) MUST permanecer
  disponível — a mudança é **aditiva**, não substitutiva.

### Key Entities

- **Comment** *(novo)*: identificador, incidente associado, autor, conteúdo e
  data/hora de criação. Somente-adição, como o histórico de status.
- **TimelineEvent** *(derivado, não persistido)*: união de alterações de status
  e comentários, ordenada cronologicamente. Não possui tabela própria.
- **Incident**: inalterado. Nenhum atributo novo; `updatedAt` continua
  significando "instante da última alteração de status".
- **StatusChange**: inalterado; passa também a compor a timeline.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das tentativas com autor ou conteúdo vazio são recusadas
  sem criar registro.
- **SC-002**: 100% dos comentários válidos são persistidos e recuperáveis após
  reinício do processo.
- **SC-003**: A timeline apresenta 100% dos eventos do incidente em ordem
  cronológica crescente, com o tipo identificável em cada um.
- **SC-004**: A ordenação é idêntica em consultas repetidas, inclusive com
  eventos de mesmo instante (0 variações).
- **SC-005**: Comentar não produz nenhuma alteração de status nem entrada de
  histórico (0 efeitos colaterais).
- **SC-006**: A suíte existente permanece 100% verde após a mudança — nenhum
  teste anterior precisa ser reescrito para acomodar o Change Request.

## Out of Scope (desta fatia)

Edição e exclusão de comentários, formatação rica (markdown, anexos), menções e
notificações, autenticação do autor (o campo é texto livre, coerente com a
ausência de autenticação no produto), reações, contagem de comentários no card
do quadro e paginação da timeline.

## Assumptions

- O autor é texto livre informado pelo usuário — não há autenticação no
  produto, portanto não há identidade a derivar.
- Comentário é atividade **sobre** o incidente, não alteração **do** incidente:
  por isso não move `updatedAt`. Essa decisão preserva o significado do campo
  já estabelecido nas fatias anteriores e é registrada explicitamente para não
  ser lida como omissão.
- A timeline é derivada em tempo de leitura a partir das duas tabelas; não há
  tabela de eventos, evitando duplicação de dados e risco de divergência.
- A mudança é aditiva no contrato da API, de modo que a suíte anterior continua
  válida sem edição — o que serve como evidência de não-regressão.
