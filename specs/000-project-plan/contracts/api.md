# Contrato da API REST — Incident Hub

Data: 2026-09-05 · Base: `/` (front consome via proxy `/api` — ver research R4)
· Codificação JSON · Erros: corpo único `{ "error": string }` em português,
nomeando o campo/filtro/recurso (constituição VI).

Convenções (R2/R6): severidades `Low | Medium | High | Critical`; status
`Open | In Progress | Resolved`; datas/horas em ISO 8601 UTC.

## Endpoints

### GET /health
Verificação de vida. → `200 { "status": "ok" }`

### GET /incidents
Lista incidentes com filtros opcionais e combináveis (fatias 001/005).

Query:
| Parâmetro  | Valores aceitos                                  | Ausente/vazio        |
|------------|--------------------------------------------------|----------------------|
| `status`   | `Open` \| `In Progress` \| `Resolved`            | sem filtro de status |
| `severity` | `Low` \| `Medium` \| `High` \| `Critical`        | sem filtro de severidade |

Comportamento:
- Sem filtros → todos os incidentes (comportamento da fatia 001 preservado).
- Um filtro → subconjunto correspondente; dois → **interseção** (005 FR-003).
- Valor fora do enum → `400 { "error": "O filtro status deve ser Open, In Progress ou Resolved" }`
  (idem severity, com seu conjunto) — nunca resultado silenciosamente errado.
- Lista vazia → `200 []` (o estado vazio compreensível é renderizado pela UI).

→ `200 Incident[]` (ordenado por createdAt decrescente — decisão de
apresentação; a spec 001 exige ordem determinística e estável)

### POST /incidents
Cria incidente (fatia 002).

Body: `{ "title": string, "description": string, "severity": Severity, "owner": string }`

- Os 4 campos são obrigatórios, string, não vazios (trim > 0). Falhas → `400`
  nomeando cada campo: `{"error":"Informe o título do incidente"}` (idem
  descrição/responsável); severidade fora do enum →
  `{"error":"A severidade deve ser Low, Medium, High ou Critical"}`.
- Campos `id`, `status`, `createdAt` enviados no body são **ignorados**: o
  incidente nasce `Open`, id e datas definidos pelo sistema.

→ `201 Incident` · Nunca gera registro de histórico (002 FR-007).

### GET /incidents/:id
Detalhe com histórico (fatia 004).

- `:id` inexistente → `404 {"error":"Incidente não encontrado"}` — específico,
  nunca genérico.

→ `200 { ...Incident, "history": StatusChange[] }` — `history` em ordem
cronológica (mais antigo primeiro); incidente sem transições → `"history": []`
(UI exibe "sem mudanças de status registradas").

### POST /incidents/:id/status
Solicita transição (fatia 004). Consome **exclusivamente** a função pura da
fatia 003 (004 FR-001).

Body: `{ "status": Status }` (novo status)

- Body sem status válido no enum → `400` nomeando o campo.
- `:id` inexistente → `404 {"error":"Incidente não encontrado"}` (verificado
  **antes** da regra).
- Recusada pela regra (mesmo status; Critical Open→Resolved) → `422
  {"error": <motivo legível da função pura>}` — **nada é alterado**: status,
  updatedAt e histórico permanecem intactos; 0 registros criados.

→ `200 Incident` quando aceita: status novo, updatedAt = agora, exatamente
um registro de histórico criado na mesma transação SQL.

### GET /dashboard
Três contadores (fatia 005), sempre recalculados do estado atual.

→ `200 { "open": number, "criticalUnresolved": number, "resolved": number }`

- `criticalUnresolved` = severity Critical ∧ status em **Open ou In Progress**
  (incluir In Progress é NON-NEGOCABLE — 005 FR-007).

## Formatos

```jsonc
// Incident
{
  "id": 1,
  "title": "Payment API instability",
  "description": "...",
  "severity": "Critical",        // Low | Medium | High | Critical
  "owner": "Ana",
  "status": "Open",              // Open | In Progress | Resolved
  "createdAt": "2026-09-05T12:00:00.000Z",
  "updatedAt": "2026-09-05T12:00:00.000Z"
}

// StatusChange (dentro de history)
{
  "id": 1,
  "incidentId": 1,
  "fromStatus": "Open",
  "toStatus": "In Progress",
  "changedAt": "2026-09-05T13:00:00.000Z"
}
```

## Contrato do front (UI)

- **Listagem** (`IncidentList.vue`): colunas título, severidade, responsável,
  status; filtros status+severity combináveis; lista vazia → mensagem de
  estado vazio, não erro.
- **Formulário** (`IncidentForm.vue`): 4 campos obrigatórios; erro da API
  exibido verbatim.
- **Detalhe** (`IncidentDetail.vue`): 8 campos + histórico cronológico +
  ação de transição; motivo de recusa exibido verbatim (a regra nunca é
  reescrita na UI — constituição III).
- **Dashboard** (`Dashboard.vue`): os 3 contadores com rótulos em português.
