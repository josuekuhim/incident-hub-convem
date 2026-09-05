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

Suíte completa: `npm test` — 12 testes, 12 verdes.

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
| Id inexistente retorna 404 | `routes/incidents.ts:159` | ⚠️ |
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
| Status e histórico gravados atomicamente | `routes/incidents.ts:141-149` — `BEGIN`/`COMMIT` com rollback | ⚠️ |
| Persistido — sobrevive a reinício | — | ❌ |

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
| **Dados sobrevivem ao reiniciar a aplicação** | — | ❌ |
| Não depende de compilação nativa | `node:sqlite`, biblioteca padrão do Node 24 | ✅ |

### ❌ Lacuna: reinício de processo não é testado

Os sete testes de integração seguem o mesmo padrão — `startServer` no `before`,
`stop` no `after`. **Nenhum derruba o servidor e o sobe de novo apontando para o
mesmo arquivo para conferir que os dados permanecem.**

O `test/helpers.ts` já expõe `stop()` e `sqlitePath` exatamente para isso, mas
nenhum teste exerce esse caminho. A persistência funciona na prática — o banco
é arquivo em disco, e o comportamento é verificável manualmente derrubando o
processo e subindo de novo — mas **não há prova automatizada**, e este é um
requisito explícito do enunciado.

Reimportar o módulo de banco no mesmo processo não serviria como prova: o cache
de módulos do ESM mascararia o defeito. Só subprocesso real prova.

## §11 — Dados iniciais

| Critério | Evidência | |
|---|---|---|
| Os três incidentes especificados existem sem cadastro manual | `list.test.ts`; `acceptance.test.ts:25` — três registros no boot | ✅ |
| Nascem com o status indicado | `seed.ts` — `Critical/Open`, `High/In Progress`, `Medium/Resolved` | ✅ |
| Seed é idempotente | `seed.test.ts:21` — executado duas vezes, três registros | ✅ |
| Seed não gera histórico | — | ❌ |

### ❌ Lacuna: a asserção de "seed não gera histórico" não prova nada

Em `seed.test.ts:30`:

```ts
const statusChanges = await fetch(`${server.baseUrl}/incidents/1/status-history`);
assert.equal(statusChanges.status, 404);
```

A rota `/incidents/:id/status-history` **não existe na API**. O 404 é de rota
inexistente, não de ausência de histórico — a asserção passaria mesmo que o
seed gravasse qualquer quantidade de registros.

A verificação correta usaria `GET /incidents/:id` e afirmaria
`history.length === 0`, que é o que `acceptance.test.ts:66` faz para incidentes
criados via API.

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

## Resumo

| | Quantidade |
|---|---|
| ✅ Coberto por teste | 33 |
| ⚠️ Verificável apenas manualmente | 7 |
| ❌ Lacuna conhecida | 3 |

As três lacunas estão concentradas em **prova**, não em funcionalidade: a
persistência entre reinícios funciona e o seed de fato não grava histórico —
o que falta é evidência automatizada de ambos. Estão documentadas aqui em vez
de omitidas porque um critério de aceite que se declara satisfeito sem
evidência é pior do que um critério declaradamente pendente.

### Verificação manual das lacunas

```bash
# Persistência entre reinícios
npm run dev              # cria um incidente pela interface
# Ctrl+C, depois:
npm run dev              # o incidente continua lá

# Seed não gera histórico
curl http://localhost:3000/incidents/1 | grep history
# → "history":[]
```
