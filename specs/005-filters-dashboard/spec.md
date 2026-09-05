# Feature Specification: Filtros de Lista e Dashboard Resumido

**Feature Branch**: `005-filters-dashboard`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Filtros de lista e dashboard resumido. Filtro por status e por severity, combináveis entre si. Ausência de filtro retorna todos os incidentes. Valor de filtro inválido é rejeitado ou ignorado de forma explícita, nunca produzindo resultado silenciosamente errado. Dashboard com três contadores calculados sobre o estado atual dos dados."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filtrar a lista por status e severidade (Priority: P1)

Uma pessoa que acompanha vários incidentes precisa enxergar apenas um
subconjunto da lista. Ela pode filtrar por **status** (Open, In Progress,
Resolved), por **severidade** (Low, Medium, High, Critical), ou pelos dois ao
mesmo tempo — nesse caso vê apenas a **interseção** (incidentes que satisfazem
as duas condições simultaneamente). Sem nenhum filtro ativo, a lista mostra
**todos** os incidentes, como sempre mostrou.

Um valor de filtro inválido (um status ou severidade que não existe no
conjunto) **nunca** produz um resultado silenciosamente errado: ou é rejeitado
com mensagem indicando o filtro problemático, ou é ignorado de forma explícita
— a pessoa sempre consegue distinguir "filtro aplicado" de "filtro desconsiderado".

**Why this priority**: Com o volume de incidentes crescendo, localizar o
subconjunto relevante é a principal necessidade operacional do dia a dia; é a
evolução natural da listagem da fatia 001.

**Independent Test**: Com um conjunto de dados conhecido (os três incidentes do
seed), aplicar cada filtro isolado, a combinação dos dois e um valor inválido —
conferindo em cada caso o subconjunto exato retornado.

**Acceptance Scenarios**:

1. **Given** a lista com os três incidentes do seed, **When** o filtro de
   status "Open" é aplicado, **Then** apenas "Payment API instability" aparece.
2. **Given** a lista com os três incidentes do seed, **When** o filtro de
   severidade "High" é aplicado, **Then** apenas "Reconciliation delay" aparece.
3. **Given** a lista com os três incidentes do seed, **When** os filtros
   status "Open" **e** severidade "Critical" são aplicados juntos, **Then**
   apenas a interseção aparece ("Payment API instability") — e a combinação
   status "In Progress" **e** severidade "Critical" retorna lista vazia com o
   estado vazio compreensível da fatia 001, não erro.
4. **Given** nenhum filtro ativo, **When** a lista é exibida, **Then** todos os
   incidentes aparecem — exatamente como na fatia 001.
5. **Given** um valor de filtro inválido (ex.: status "Archived" ou severidade
   "Urgent"), **When** a consulta é feita, **Then** o valor é rejeitado ou
   ignorado de forma explícita — e o resultado exibido nunca é um subconjunto
   silenciosamente errado.
6. **Given** filtros aplicados, **When** uma transição de status muda um
   incidente (fatia 004), **Then** os filtros passam a refletir o novo estado
   na próxima consulta — o filtro opera sobre o estado atual, não sobre um
   retrato antigo.

---

### User Story 2 - Dashboard com os três contadores essenciais (Priority: P2)

Uma pessoa que abre a aplicação quer responder em um olhar: "quantos
incidentes estão abertos, quantos Critical ainda não foram resolvidos e quantos
já foram resolvidos?". O dashboard exibe **três contadores**, sempre calculados
sobre o **estado atual** dos dados:

1. **Incidentes abertos** — incidentes com status **Open**;
2. **Critical não resolvidos** — incidentes com severidade **Critical** e
   status **Open ou In Progress**;
3. **Incidentes resolvidos** — incidentes com status **Resolved**.

**Atenção (regra NON-NEGOTIABLE desta fatia)**: o contador de Critical não
resolvidos **inclui** incidentes em In Progress. Contar apenas os que estão em
Open é um **erro** — um Critical em andamento ainda não está resolvido e não
pode sumir do radar.

**Why this priority**: É o resumo executivo que orienta a priorização da
equipe; o contador de Critical não resolvidos é o número que ninguém pode
subestimar. Depende apenas dos dados já persistidos pelas fatias anteriores.

**Independent Test**: Com os três incidentes do seed, conferir os três
contadores; executar a sequência de transições do aceite e reconferir os
contadores após cada passo.

**Acceptance Scenarios**:

1. **Given** os dados iniciais do seed (Critical em Open, High em In Progress,
   Medium em Resolved), **When** o dashboard é exibido, **Then** ele mostra
   exatamente: **1 aberto**, **1 Critical não resolvido** e **1 resolvido**.
2. **Given** o Critical em Open, **When** ele é movido para In Progress (via
   transição aceita da fatia 004), **Then** o dashboard mostra **0 abertos** e
   **1 Critical não resolvido** — o Critical em In Progress **continua
   contado**.
3. **Given** o Critical em In Progress, **When** ele é movido para Resolved,
   **Then** o dashboard mostra **0 Critical não resolvidos** e **2
   resolvidos**.
4. **Given** qualquer estado dos dados, **When** o dashboard é exibido após um
   reinício do processo, **Then** os contadores refletem o mesmo estado
   persistido (0 divergência).

---

### Edge Cases

- Filtro que não casa com nenhum incidente (ex.: severidade "Critical" + status
  "Resolved" no seed): lista vazia com estado vazio compreensível — não erro.
- Valor de filtro em maiúsculas/minúsculas diferentes do conjunto (ex.:
  "critical"): tratado de forma explícita (aceito por normalização ou
  rejeitado com mensagem) — nunca tratado como valor desconhecido silencioso.
- Múltiplos valores de filtro simultâneos além dos dois definidos: fora de
  escopo; apenas status e severity são filtráveis.
- Todos os incidentes resolvidos: abertos em 0, Critical não resolvidos em 0,
  resolvidos com o total de Resolved — sem divisão por zero ou erro de exibição.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A lista MUST aceitar filtro por **status** com valores Open, In
  Progress e Resolved.
- **FR-002**: A lista MUST aceitar filtro por **severity** com valores Low,
  Medium, High e Critical.
- **FR-003**: Os dois filtros MUST ser combináveis entre si; quando ambos
  ativos, o resultado MUST ser a **interseção** dos dois subconjuntos.
- **FR-004**: Ausência de filtro MUST retornar todos os incidentes,
  preservando o comportamento da fatia 001.
- **FR-005**: Valor de filtro inválido MUST ser rejeitado com mensagem
  indicando o filtro, ou ignorado de forma explícita — nunca produzindo
  resultado silenciosamente errado (constituição, Princípio VI).
- **FR-006**: O dashboard MUST exibir três contadores calculados sobre o estado
  atual dos dados: incidentes abertos (status Open), Critical não resolvidos
  (severity Critical **e** status Open **ou** In Progress) e incidentes
  resolvidos (status Resolved).
- **FR-007**: O contador de Critical não resolvidos MUST incluir incidentes em
  In Progress — contabilizar apenas Open é erro de implementação e falha no
  aceite (constituição, Princípio V).
- **FR-008**: Os contadores e os filtros MUST refletir o estado persistido
  atual, sobrevivendo ao reinício do processo (constituição, Princípio IV).
- **FR-009**: A suíte de testes MUST cobrir: cada filtro isolado, a interseção
  dos dois, valor de filtro inválido e os três contadores — incluindo o
  cenário do Critical não resolvido contabilizado em Open **e** em In Progress
  (constituição, Princípio V).

### Key Entities *(include if feature involves data)*

- **Incident**: apenas lido por esta fatia — nenhum atributo é criado, alterado
  ou removido aqui. Filtros e contadores operam sobre severity e status
  persistidos.
- **Critério de contagem**: definição de domínio dos três contadores (abertos =
  Open; Critical não resolvidos = Critical ∧ (Open ∨ In Progress); resolvidos =
  Resolved) — cada incidente conta em no máximo um dos conjuntos "abertos" e
  "resolvidos", e pode coincidir com "Critical não resolvidos" quando Critical.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cada filtro isolado retorna exatamente o subconjunto
  correspondente em 100% dos casos testados (status: 3 valores; severidade: 4
  valores, todos verificados contra os dados do seed).
- **SC-002**: A combinação dos dois filtros retorna exatamente a interseção em
  100% dos pares testados (incluindo pares com resultado vazio).
- **SC-003**: Com os dados iniciais do seed, o dashboard mostra 1 aberto,
  1 Critical não resolvido e 1 resolvido (3/3 exatos).
- **SC-004**: Após mover o Critical de Open para In Progress, o dashboard
  mostra 0 abertos e **1 Critical não resolvido** (o Critical em In Progress
  permanece contado — 0 subestimação).
- **SC-005**: Após resolver esse Critical (via In Progress), o dashboard mostra
  0 Critical não resolvidos e 2 resolvidos.
- **SC-006**: 100% dos valores de filtro inválidos testados são rejeitados com
  mensagem ou ignorados de forma explícita (0 resultados silenciosamente
  errados).
- **SC-007**: Após reinício do processo, filtros e contadores refletem o estado
  persistido sem divergência (0 perdas).

## Out of Scope (desta fatia)

Ordenação da lista, busca textual, paginação e contagem por severidade não
fazem parte desta spec. Permanecem fora de escopo permanente: edição e
exclusão de incidente, autenticação, permissões, multi-tenant e deploy público.

## Assumptions

- O dashboard aparece como visão resumida da aplicação (página ou painel na
  listagem); a localização exata é decisão da fase de planejamento.
- "Incidentes abertos" e "incidentes resolvidos" são definidos exclusivamente
  pelo status — não por interpretação de severidade, histórico ou tempo.
- Filtro com valor válido em convenção de caixa diferente (ex.: "critical")
  pode ser normalizado para aceitação; a escolha (normalizar ou rejeitar com
  mensagem) é da fase de planejamento, desde que explícita e consistente.
- Filtros vazios (parâmetro ausente ou vazio) equivalem a "sem filtro" —
  retornam todos os incidentes, sem rejeição.
- Os contadores não são armazenados: são sempre recalculados a partir dos
  dados atuais (não há estado de dashboard a persistir).
