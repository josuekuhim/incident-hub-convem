# Feature Specification: Regra de Transição de Status (Domínio Puro)

**Feature Branch**: `003-status-transition-rules`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Regra de transição de status como domínio puro, sem interface e sem persistência. Função pura que recebe severity, statusAtual e statusDestino e retorna permitido, ou recusado com motivo legível."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Avaliar qualquer transição de forma determinística (Priority: P1)

A aplicação precisa de uma **única resposta autoritativa** para a pergunta
"esta mudança de status pode acontecer?". Dada uma severidade (Low, Medium,
High, Critical), um status atual e um status de destino (Open, In Progress,
Resolved), a regra responde **permitido** ou **recusado com motivo legível** —
sempre a mesma resposta para as mesmas entradas, sempre que avaliada, em
qualquer ordem, sem depender de dados externos, do momento da avaliação ou do
histórico do incidente.

As duas recusas possíveis são exatamente:

1. **Destino igual ao status atual** — não existe "mudança" para o mesmo
   status; recusado com motivo indicando que o status já é esse.
2. **Critical saindo de Open direto para Resolved** — recusado com motivo
   indicando que um incidente Critical precisa **passar por In Progress**
   antes de ser resolvido.

Toda outra combinação de status distintos é permitida, para qualquer
severidade — inclusive Low, Medium e High indo de Open direto para Resolved,
sem impedimento.

**Why this priority**: É o coração do domínio e a materialização da regra do
Critical da constituição (Princípio III). A fatia de transição real (fatia
futura) só pode ser construída em cima desta resposta determinística.

**Independent Test**: Avaliar a matriz completa de 4 severidades × 3 status de
origem × 3 status de destino (36 combinações) e conferir cada resultado contra
a matriz explícita desta spec, isoladamente — sem banco, sem rede, sem
relógio, sem interface.

**Acceptance Scenarios**:

1. **Given** severity Critical, statusAtual Open e statusDestino Resolved,
   **When** a regra é avaliada, **Then** o resultado é **recusado** com motivo
   que indica a necessidade de passar por In Progress.
2. **Given** severity Critical, statusAtual Open e statusDestino In Progress,
   **When** a regra é avaliada, **Then** o resultado é **permitido**.
3. **Given** severity Critical, statusAtual In Progress e statusDestino
   Resolved, **When** a regra é avaliada, **Then** o resultado é **permitido**.
4. **Given** severidade High, Medium ou Low, statusAtual Open e statusDestino
   Resolved, **When** a regra é avaliada, **Then** o resultado é **permitido**
   — a restrição do Critical não se aplica a essas severidades.
5. **Given** qualquer severidade e statusDestino igual ao statusAtual (ex.:
   High, Open → Open), **When** a regra é avaliada, **Then** o resultado é
   **recusado** com motivo legível.
6. **Given** severity Critical, statusAtual Resolved e statusDestino Open,
   **When** a regra é avaliada, **Then** o resultado é **permitido**.

---

### User Story 2 - Matriz completa explícita e verificável (Priority: P2)

Qualquer pessoa que precise entender ou alterar as regras de transição encontra
nesta spec a matriz completa — 4 severidades × 3 status de origem × 3 status de
destino — com o resultado explícito de cada uma das 36 combinações. Os testes
automatizados cobrem **toda a matriz**, de modo que qualquer mudança futura na
regra quebre um teste antes de quebrar o comportamento.

**Why this priority**: A exigência de cobertura total da matriz é o que torna a
regra alterável com segurança (constituição: máquina de estados em um único
arquivo). Sem a matriz inteira sob teste, uma mudança "segura" poderia mudar
silenciosamente uma combinação não coberta.

**Independent Test**: Rodar a suíte de testes unitários da regra e verificar
que ela exercita as 36 combinações — e apenas interações de domínio (nada de
persistência, API ou UI).

**Acceptance Scenarios**:

1. **Given** a suíte de testes unitários da regra, **When** ela é executada,
   **Then** todas as 36 combinações da matriz são avaliadas com resultado
   explícito, sem tocar em persistência, API ou UI.
2. **Given** a mesma entrada avaliada repetidamente, em qualquer ordem,
   **When** o resultado é comparado entre avaliações, **Then** ele é sempre
   idêntico (a regra é determinística e não depende de relógio nem de estado).

---

### Matriz explícita de resultados

**Critical:**

| Origem ↓ / Destino → | Open             | In Progress      | Resolved                                  |
|----------------------|------------------|------------------|-------------------------------------------|
| Open                 | recusado (mesmo status) | permitido | **recusado (deve passar por In Progress)** |
| In Progress          | permitido        | recusado (mesmo status) | permitido                           |
| Resolved             | permitido        | permitido        | recusado (mesmo status)                   |

**Low, Medium e High** (as três severidades compartilham a mesma matriz — a
restrição do Critical NÃO se aplica a elas):

| Origem ↓ / Destino → | Open             | In Progress      | Resolved       |
|----------------------|------------------|------------------|----------------|
| Open                 | recusado (mesmo status) | permitido | **permitido**  |
| In Progress          | permitido        | recusado (mesmo status) | permitido |
| Resolved             | permitido        | permitido        | recusado (mesmo status)   |

Contagem: 36 combinações = 12 recusas por destino-igual-à-origem (3 pares × 4
severidades) + 1 recusa Critical Open → Resolved + 23 permitidas.

**Casos-âncora** (todos cobertos pelos cenários de aceitação acima): Critical
Open → Resolved recusado; Critical Open → In Progress permitido; Critical
In Progress → Resolved permitido; High Open → Resolved permitido; Medium Open →
Resolved permitido; Low Open → Resolved permitido; Critical Resolved → Open
permitido; High Open → Open recusado.

### Edge Cases

- Severidade fora do conjunto (ex.: " Urgent"): não é entrada válida desta
  regra; o tratamento de valores inválidos pertence à validação de entrada da
  fatia que usar a regra — documentado como suposição, fora do escopo aqui.
- Status fora do conjunto (ex.: "Closed"): idem.
- A regra avaliada com as mesmas entradas milhares de vezes: sempre o mesmo
  resultado (sem relógio, sem aleatoriedade, sem estado interno).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST expor a regra de transição como uma **função
  pura** que recebe severity, statusAtual e statusDestino e retorna
  **permitido** ou **recusado com motivo legível**.
- **FR-002**: A regra MUST ser determinística: mesma entrada ⇒ mesma saída,
  independentemente do número ou ordem de avaliações.
- **FR-003**: A regra MUST recusar qualquer avaliação em que statusDestino seja
  igual ao statusAtual, com motivo legível indicando que o status já é esse.
- **FR-004**: A regra MUST recusar Critical com statusAtual Open e
  statusDestino Resolved, com motivo legível indicando a necessidade de passar
  por In Progress.
- **FR-005**: A regra MUST permitir toda combinação de status distintos não
  coberta pelo FR-004, para qualquer severidade — incluindo Low, Medium e High
  de Open direto para Resolved.
- **FR-006**: A regra MUST viver em **um único arquivo**, isolado de rotas, UI
  e persistência, alterável sem tocar em qualquer outro módulo (constituição,
  Princípio III).
- **FR-007**: A regra MUST consultar nenhum dado externo: sem banco, sem rede,
  sem relógio, sem framework, sem leitura do histórico de status.
- **FR-008**: A suíte de testes unitários MUST cobrir a matriz completa (4
  severidades × 3 origens × 3 destinos = 36 combinações) com resultado
  explícito, incluindo todos os casos-âncora, sem tocar em persistência, API
  ou UI.

### Key Entities *(include if feature involves data)*

- **Regra de transição (domínio)**: função pura com três entradas — severity
  (Low, Medium, High, Critical), statusAtual (Open, In Progress, Resolved),
  statusDestino (Open, In Progress, Resolved) — e um resultado binário com
  motivo: permitido, ou recusado com texto legível. Não mantém estado e não
  referencia Incident ou StatusChange.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: As 36 combinações da matriz produzem resultado explícito e
  idêntico ao das tabelas desta spec, verificado por testes unitários (36/36).
- **SC-002**: Os 8 casos-âncora produzem exatamente os resultados listados
  (8/8), incluindo os motivos esperados nas recusas.
- **SC-003**: A regra é avaliada por testes sem nenhum acesso a persistência,
  rede, relógio ou interface (0 dependências externas no caminho testado).
- **SC-004**: Alterar a matriz de transição exige mudar exatamente 1 arquivo;
  nenhum teste de rotas, UI ou persistência precisa ser tocado para essa
  mudança.
- **SC-005**: 100% das recusas retornam motivo legível em português, e 0
  recusas retornam sucesso ou motivo vazio.

## Out of Scope (desta fatia)

Aplicar a regra a um incidente real, persistir qualquer mudança de status,
atualizar updatedAt ou histórico, e exibir mensagem na interface. Esta fatia
entrega exclusivamente a regra pura e seus testes unitários — a integração com
incidentes reais é fatia futura.

## Assumptions

- Entradas inválidas (severidade ou status fora dos conjuntos definidos) não
  são responsabilidade desta regra: quem a consome valida as entradas antes
  (a validação de entrada é comportamento da fatia de transição real).
- Os motivos de recusa são textos em português, legíveis para o usuário final,
  redigidos na implementação conforme o exigido no FR-003 e FR-004 (o texto
  exato não é fixado nesta spec; o requisito é o conteúdo semântico: indicar
  mesmo status, ou indicar a passagem obrigatória por In Progress).
- "Permitido" e "recusado com motivo" são as duas únicas saídas possíveis —
  não há terceiro estado (ex.: "indefinido").
- A localização exata do arquivo único na estrutura do projeto é decisão da
  fase de planejamento, respeitando o FR-006.
