# Data Model: Incident Hub

Data: 2026-09-05 · Cobertura: fatias 001–005 · Fontes: specs 001–005, research.md

## Entidades

### incidents

| Campo       | Tipo (SQLite) | Regras de validação (da spec)                                        |
|-------------|---------------|----------------------------------------------------------------------|
| id          | INTEGER PK AUTOINCREMENT | definido pelo sistema; enviado pelo usuário é ignorado (002 FR-005) |
| title       | TEXT NOT NULL | obrigatório, não vazio (trim > 0) — 002 FR-002                       |
| description | TEXT NOT NULL | obrigatório, não vazio (trim > 0) — 002 FR-002                        |
| severity    | TEXT NOT NULL CHECK(severity IN ('Low','Medium','High','Critical')) | obrigatório, fora do enum é rejeitado — 002 FR-003 |
| owner       | TEXT NOT NULL | obrigatório, não vazio — 002 FR-002                                  |
| status      | TEXT NOT NULL CHECK(status IN ('Open','In Progress','Resolved')) | nasce 'Open' sempre — 002 FR-004; valor informado ignorado |
| created_at  | INTEGER NOT NULL (epoch ms) | definido pelo sistema; enviado ignorado — 002 FR-004/005 |
| updated_at  | INTEGER NOT NULL (epoch ms) | = created_at na criação; = agora a cada transição aceita — 004 FR-002 |
| seed_key    | TEXT UNIQUE NULL | marca registros de seed; base da idempotência (R5) — 001 FR-006   |

Nota: NOT NULL sem default nos 4 campos do usuário — o padrão ausente é
deliberado: entrada faltante deve falhar na validação, não virar default
silencioso (corrige o scaffold, que fazia `DEFAULT 'medium'`).

### status_changes (somente-adição — nenhum UPDATE/DELETE no código)

| Campo       | Tipo (SQLite) | Regras                                                               |
|-------------|---------------|----------------------------------------------------------------------|
| id          | INTEGER PK AUTOINCREMENT | do sistema                                                |
| incident_id | INTEGER NOT NULL REFERENCES incidents(id) | incidente dono do histórico |
| from_status | TEXT NOT NULL | status anterior — 004 FR-002                                         |
| to_status   | TEXT NOT NULL | novo status — 004 FR-002                                             |
| changed_at  | INTEGER NOT NULL (epoch ms) | = updated_at da mesma transição — 004 FR-002 |

Invariantes (constituição IV / spec 004):
- Append-only: apenas INSERT; nenhum caminho de código altera ou remove.
- Exatamente 1 registro por transição aceita; 0 por criação, seed ou recusa.
- Indivisível do UPDATE do incidente (mesma transação SQL — R7).

## Máquina de estados (fatia 003 — única fonte: `apps/api/src/domain/status-rules.ts`)

Função pura `avaliarTransicao(severity, statusAtual, statusDestino)` →
`{ permitido: true } | { permitido: false, motivo: string }`.

- statusDestino === statusAtual → recusado ("o incidente já está em X").
- severity === 'Critical' ∧ statusAtual === 'Open' ∧ statusDestino === 'Resolved'
  → recusado ("incidentes Critical precisam passar por In Progress antes de
  serem resolvidos").
- Qualquer outra combinação de status distintos → permitido (inclui
  Low/Medium/High de Open → Resolved).

Matriz completa (36 casos) e casos-âncora: ver spec 003; testes em
`apps/api/test/domain/status-rules.test.ts` cobrem as 36 combinações.

## Critérios de contagem do dashboard (fatia 005)

| Contador                | Definição sobre o estado atual                 |
|-------------------------|------------------------------------------------|
| Incidentes abertos      | `status = 'Open'`                              |
| Critical não resolvidos | `severity = 'Critical' AND status IN ('Open','In Progress')` — incluir In Progress é NON-NEGOTIABLE |
| Incidentes resolvidos   | `status = 'Resolved'`                          |

Recalculados a cada consulta (não armazenados — research R2/assunção da 005).

## Regras de validação de entrada (borda HTTP)

- Criação (POST /incidents): os 4 campos devem existir, ser string e ter
  trim > 0; severidade ∈ enum; id/status/createdAt enviados são ignorados.
  Falhas → 400 com mensagem nomeando cada campo (ex.: "Informe o título do
  incidente", "A severidade deve ser Low, Medium, High ou Critical").
- Filtros (GET /incidents?status=&severity=): valor presente deve estar no
  enum; caso contrário 400 nomeando o filtro (decisão explícita de rejeitar —
  R8; a alternativa "ignorar explicitamente" é permitida pela spec, mas
  rejeitar é mais simples e honesto). Ausente/vazio = sem filtro.
- Transição (POST /incidents/:id/status): body `{ "status": <novo> }` com
  valor no enum; id inexistente → 404 "Incidente não encontrado"; recusa da
  regra → 422 com o motivo legível vindo da função pura, sem alterar dados.
- Detalhe (GET /incidents/:id): inexistente → 404 específico, nunca genérico.
