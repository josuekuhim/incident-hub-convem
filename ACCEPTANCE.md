# Critérios de Aceite — Incident Hub

Rastreabilidade entre cada requisito do desafio, o código que o implementa e a
evidência automatizada que o prova.

A régua adotada: **um requisito só é considerado concluído quando existe teste
que falharia se ele quebrasse.** Tela que parece funcionar não é evidência.

**Legenda**

| | Significado |
|---|---|
| ✅ | Implementado e coberto por teste automatizado |
| ⚠️ | Implementado e verificável manualmente, sem teste automatizado |
| ❌ | Lacuna conhecida |

Suíte completa: `npm test` — 22 testes, 22 verdes (inclui o Change Request #1).

---

## §3 — Modelo do incidente

| Critério | Evidência | |
|---|---|---|
| Possui identificador, título, descrição, severidade, responsável, status, criação e última atualização | `db/sqlite.ts` (schema), `routes/incidents.ts` (`toIncident`) | ✅ |
| Severidade restrita a Low / Medium / High / Critical | `CHECK` constraint no banco + `domain/constants.ts` | ✅ |
| Status restrito a Open / In Progress / Resolved | `CHECK` constraint no banco + `domain/constants.ts` | ✅ |
| Timestamps expostos em formato válido | `acceptance.test.ts:26` — todo incidente tem `createdAt` e `updatedAt` parseáveis | ✅ |

Os enums são garantidos **pelo banco**, não apenas pela aplicação: uma escrita
que contorne a validação da API ainda assim não grava valor inválido.

## §4 — Criar incidente

| Critério | Evidência | |
|---|---|---|
| Título, descrição, severidade e responsável são obrigatórios | `validation.test.ts` — rejeita cada campo ausente e vazio, nomeando o campo | ✅ |
| Severidade fora do enum é rejeitada | `validation.test.ts`; `acceptance.test.ts:95` | ✅ |
| Texto é normalizado (trim) antes de gravar | `validation.test.ts` | ✅ |
| Todo incidente nasce em `Open` | `acceptance.test.ts:51` — cliente envia `status: 'Resolved'`, resultado é `Open` | ✅ |
| Data/hora de criação é registrada automaticamente | `acceptance.test.ts:53` — `createdAt === updatedAt` na criação | ✅ |
| `id` e timestamps enviados pelo cliente são ignorados | `acceptance.test.ts:52` — cliente envia `id: 999` e `createdAt` de 2000, ambos descartados | ✅ |
| Criação não gera registro de histórico | `acceptance.test.ts:66` — histórico vazio logo após criar | ✅ |

Este é o ponto mais bem coberto da aplicação. O teste envia deliberadamente
campos controlados pelo servidor para provar que a API não confia no cliente.

## §5 — Lista de incidentes

| Critério | Evidência | |
|---|---|---|
| Apresenta título, severidade, responsável e status | `KanbanBoard.vue` — card com os quatro campos | ⚠️ |
| Filtro por status | `filters.test.ts`; `GET /incidents?status=` | ✅ |
| Filtro por severidade | `filters.test.ts`; `GET /incidents?severity=` | ✅ |
| Filtros combinam como interseção | `filters.test.ts`; `acceptance.test.ts:90` — `?status=Resolved&severity=Critical` | ✅ |
| Valor de filtro inválido falha explicitamente | `acceptance.test.ts:96` — `?severity=Urgent` retorna 400 nomeando o filtro | ✅ |
| Estado vazio é tratado | `list.test.ts` — lista sem seed | ✅ |

Recusar filtro inválido com erro, em vez de devolver lista vazia, é decisão
deliberada: lista vazia silenciosa faria o usuário concluir que não há
incidentes daquele tipo.

**Não há testes automatizados de front-end.** Todos os critérios de UI são
verificáveis apenas manualmente.

## §6 — Detalhes do incidente

| Critério | Evidência | |
|---|---|---|
| `GET /incidents/:id` retorna os sete campos e o histórico | `acceptance.test.ts:79` | ✅ |
| Id inexistente retorna 404 no detalhe | `routes/incidents.ts:216` — sem teste automatizado; o 404 análogo em comentários é coberto por `comments.test.ts` | ⚠️ |
| Tela exibe os sete campos, datas em pt-BR e o histórico | `IncidentDetail.vue` | ⚠️ |

## §7 — Alteração de status

| Critério | Evidência | |
|---|---|---|
| **`Critical` não vai de `Open` direto para `Resolved`** | `status-rules.test.ts` — matriz completa 4×3×3, 36 combinações | ✅ |
| A recusa não produz efeito nenhum | `acceptance.test.ts:63-67` — status inalterado, histórico vazio, `updatedAt` inalterado | ✅ |
| A recusa retorna feedback compreensível | `transition.test.ts:36`; `acceptance.test.ts:61` — mensagem cita "passar por In Progress" | ✅ |
| `Open → In Progress → Resolved` é aceito | `acceptance.test.ts:69-77` | ✅ |
| Status de destino inválido é rejeitado | `validation.test.ts` | ✅ |
| A UI exibe a mensagem da API sem reescrevê-la | `KanbanBoard.vue:65`, `IncidentDetail.vue:36` | ⚠️ |

A regra vive em `domain/status-rules.ts` como função pura, sem I/O. É o único
lugar do sistema que decide transição — rotas e UI apenas consomem. Por isso a
matriz de 36 casos é prova suficiente da regra em si: não há caminho
alternativo que a contorne.

Verificar que a recusa **não deixa rastro** é tão importante quanto verificar
que ela acontece. Uma implementação que recusa mas mesmo assim atualiza
`updatedAt` passaria num teste ingênuo.

## §8 — Histórico

| Critério | Evidência | |
|---|---|---|
| Registra status anterior, novo status e data/hora | `acceptance.test.ts:84-88` — pares `[Open, In Progress]`, `[In Progress, Resolved]` na ordem | ✅ |
| Associado ao incidente correspondente | `status_changes.incident_id` com FK; `transition.test.ts:48` | ✅ |
| Somente-adição: uma transição aceita grava exatamente um registro | `transition.test.ts:48`; `acceptance.test.ts:83` | ✅ |
| Status e histórico gravados atomicamente | `routes/incidents.ts:170-178` — `BEGIN`/`COMMIT` com rollback | ⚠️ |
| Persistido — sobrevive a reinício | `persistence.test.ts` — cria e altera em um processo, reinicia outro no mesmo SQLite e confere status + histórico | ✅ |

## §9 — Dashboard

| Critério | Evidência | |
|---|---|---|
| Conta incidentes abertos | `dashboard.test.ts`; `acceptance.test.ts:100` | ✅ |
| Conta `Critical` ainda não resolvidos | `dashboard.test.ts` | ✅ |
| **`Critical` não resolvido inclui `In Progress`, não só `Open`** | `dashboard.test.ts` | ✅ |
| Conta incidentes resolvidos | `dashboard.test.ts`; `acceptance.test.ts:100` | ✅ |
| Valores refletem o estado atual dos dados | `dashboard.test.ts` — sequência 1/1/1 → 0/1/1 → 0/0/2 conforme as transições ocorrem | ✅ |

Contar `Critical` não resolvido apenas em `Open` seria o erro natural aqui — um
incidente crítico em tratamento continua não resolvido. O teste percorre a
sequência de transições justamente para pegar isso.

## §10 — Persistência

| Critério | Evidência | |
|---|---|---|
| Dados sobrevivem ao recarregar a página | Estado vive no SQLite, não no cliente; toda leitura vem da API | ✅ |
| **Dados sobrevivem ao reiniciar a aplicação** | `persistence.test.ts` — dois subprocessos reais apontando para o mesmo arquivo SQLite | ✅ |
| Não depende de compilação nativa | `node:sqlite`, biblioteca padrão do Node 24 | ✅ |

### Persistência entre processos comprovada

`persistence.test.ts` cria um incidente High, faz a transição Open → Resolved,
encerra o processo do servidor e inicia um **novo subprocesso** apontando para o
mesmo arquivo SQLite. O segundo processo precisa encontrar o incidente com
status Resolved e o histórico `Open → Resolved`. Isso prova a persistência sem
ser mascarado pelo cache de módulos do ESM.

## §11 — Dados iniciais

| Critério | Evidência | |
|---|---|---|
| Os três incidentes especificados existem sem cadastro manual | `list.test.ts`; `acceptance.test.ts:25` — três registros no boot | ✅ |
| Nascem com o status indicado | `seed.ts` — `Critical/Open`, `High/In Progress`, `Medium/Resolved` | ✅ |
| Seed é idempotente | `seed.test.ts:21` — executado duas vezes, três registros | ✅ |
| Seed não gera histórico | `seed.test.ts` — detalhe de cada incidente seedado tem `history: []` | ✅ |

### Seed sem histórico comprovado

`seed.test.ts` executa o seed duas vezes e, para cada incidente retornado,
consulta `GET /incidents/:id` e exige `history: []`. A asserção anterior contra
uma rota inexistente foi removida, pois um 404 não comprovava nada sobre o
histórico.

## §12 — Requisitos de qualidade

| Critério | Evidência | |
|---|---|---|
| Executável localmente | `npm install && npm run dev` — README | ✅ |
| Possui persistência | SQLite em arquivo | ✅ |
| Trata entradas inválidas relevantes | `validation.test.ts` — campos, enums e filtros | ✅ |
| Feedback compreensível em operações inválidas | Contrato `{ error }` em português nomeando o campo; UI exibe verbatim | ✅ |
| Interface minimamente utilizável | Quadro Kanban com transição inline | ⚠️ |
| Instruções claras de execução | `README.md` | ✅ |
| Testes das regras críticas | Matriz de transição, contadores, validação, histórico | ✅ |
| Reproduzível a partir do repositório | Sem módulo nativo; toda variável com default funcional | ✅ |

---

---

# Change Request #1 — Comentários e Timeline

Spec: [`specs/007-comments-timeline/spec.md`](specs/007-comments-timeline/spec.md).
Decisões e riscos: seção *Change Request #1* do [`PLAN.md`](PLAN.md).

## CR §1 — Comentários

| Critério | Evidência | |
|---|---|---|
| Um incidente pode ter múltiplos comentários | `comments.test.ts` — três comentários preservados na ordem, nenhum substituído | ✅ |
| Cada comentário tem autor, conteúdo e data/hora | `db/sqlite.ts` (tabela `comments`); `routes/incidents.ts` (`toComment`) | ✅ |
| A data/hora é definida pelo servidor | `comments.test.ts` — cliente envia `createdAt` de 2000 e `id: 999`, ambos descartados | ✅ |
| Autor obrigatório — ausente, vazio ou só espaços é recusado | `comment-validation.test.ts`; `comments.test.ts` | ✅ |
| Conteúdo obrigatório — ausente, vazio ou só espaços é recusado | `comment-validation.test.ts`; `comments.test.ts` | ✅ |
| A recusa nomeia o campo e **não grava nada** | `comments.test.ts` — após seis tentativas inválidas, `comments` e `timeline` seguem vazias | ✅ |
| Campos são normalizados (trim) antes de gravar | `comment-validation.test.ts`; `comments.test.ts` | ✅ |
| Comentar em incidente inexistente retorna 404 sem criar | `comments.test.ts` | ✅ |
| Comentar não altera status nem gera histórico de status | `comments.test.ts` — status, `updatedAt` e `history` inalterados | ✅ |
| A interface permite comentar a partir do detalhe e exibe a recusa | `IncidentDetail.vue` — formulário e mensagem de erro | ⚠️ |

Provar que a recusa **não deixa rastro** importa tanto quanto provar que ela
acontece: uma implementação que valida mas grava mesmo assim passaria em um
teste que só conferisse o código HTTP.

## CR §2 — Timeline

| Critério | Evidência | |
|---|---|---|
| Timeline única reúne alterações de status e comentários | `comments.test.ts` — sequência `comment · status · comment · status` | ✅ |
| Eventos em ordem cronológica crescente | `comments.test.ts` — timestamps comparados contra a própria lista ordenada | ✅ |
| O tipo de cada evento é identificável | União discriminada por `type` (`status` \| `comment`), validada pelo `vue-tsc` no template | ✅ |
| Ordenação determinística para eventos de mesmo instante | Desempate `(instante, tipo, id)`; `comments.test.ts` consulta duas vezes e exige resultado idêntico | ✅ |
| Timeline vazia é tratada como estado, não erro | `comments.test.ts`; `IncidentDetail.vue` — "sem atividade registrada" | ✅ |
| A tela apresenta os dois tipos distinguíveis | `IncidentDetail.vue` — "Status alterado: X → Y" e "Autor comentou: …" | ⚠️ |

## CR §3 — Persistência

| Critério | Evidência | |
|---|---|---|
| Comentários sobrevivem a reinício do processo | `comments.test.ts` — dois subprocessos reais sobre o mesmo SQLite | ✅ |
| A ordem da timeline sobrevive intacta ao reinício | `comments.test.ts` — timeline comparada por igualdade profunda antes e depois | ✅ |
| Bancos existentes ganham a tabela sem passo manual | `CREATE TABLE IF NOT EXISTS comments` no boot | ✅ |

## CR §4 — Compatibilidade

| Critério | Evidência | |
|---|---|---|
| Funcionalidades anteriores não foram comprometidas | **Os 13 testes anteriores passam sem nenhuma edição** | ✅ |
| O contrato existente do detalhe segue disponível | `history` mantido; `comments` e `timeline` são aditivos | ✅ |
| A regra `Critical` continua íntegra | `status-rules.test.ts` 36/36; verificado também na aplicação em execução | ✅ |

A mudança ser aditiva é o que torna a não-regressão demonstrável: nenhum teste
anterior precisou ser adaptado para acomodar o Change Request, então o fato de
continuarem verdes é prova, e não coincidência.

---

## Resumo

| | Quantidade |
|---|---|
| ✅ Coberto por teste | 65 |
| ⚠️ Verificável apenas manualmente | 8 |
| ❌ Lacuna conhecida | 0 |

Suíte após o Change Request: **22 testes, 22 verdes** — 13 originais intocados
e 9 novos.

Não há lacunas conhecidas entre os critérios de aceite persistidos. Os itens
marcados com ⚠️ são requisitos de interface ou de atomicidade verificáveis
manualmente; exigiriam uma suíte de testes de frontend e injeção controlada de
falha no banco para também terem prova automatizada.

### Verificação manual complementar

```bash
# Persistência entre reinícios (também coberta por persistence.test.ts)
npm run dev              # cria um incidente pela interface
# Ctrl+C, depois:
npm run dev              # o incidente continua lá

# Seed não gera histórico (também coberto por seed.test.ts)
curl http://localhost:3000/incidents/1 | grep history
# → "history":[]
```
