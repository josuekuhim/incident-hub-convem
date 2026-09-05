# AI_LOG.md

Registro das interações com IA relevantes para entender como esta solução foi
construída, escrito no momento em que aconteceram (Princípio VIII da
constituição do projeto).

Cada interação significativa segue a estrutura **Objetivo · Contexto ·
Instrução · Resultado · Validação · Decisão**. As situações em que a IA errou,
houve regressão, uma abordagem foi abandonada ou uma sugestão foi rejeitada
estão consolidadas na seção final.

O fluxo de trabalho foi o **Spec Kit**: cada fatia começa por uma especificação
com critérios de aceite testáveis (`$speckit-specify`), passa por planejamento
(`$speckit-plan`), decomposição em tarefas (`$speckit-tasks`) e implementação
incremental (`$speckit-implement`). As instruções citadas abaixo são esses
comandos, sempre acompanhados do contexto descrito em cada entrada.

---

## 1 — Constituição do projeto

**Objetivo.** Estabelecer regras invioláveis antes de escrever código, para que
as decisões seguintes tivessem um critério objetivo em vez de preferência
pontual.

**Contexto.** Enunciado do desafio e o scaffold inicial do monorepo.

**Instrução.** `$speckit-constitution` — derivar princípios a partir dos
requisitos e das restrições de tempo.

**Resultado.** `.specify/memory/constitution.md` v1.0.0, com oito princípios.
Os que mais afetaram o projeto: **III** (máquina de estados pura e
centralizada), **IV** (persistência e histórico somente-adição), **V** (testes
obrigatórios por fatia) e **VII** (portabilidade — proibido módulo que exija
compilação nativa).

**Validação.** Revisão manual de cada princípio contra os requisitos do
enunciado, verificando que nenhum criava trabalho fora do escopo pedido.

**Decisão.** Adotar a constituição como gate: nenhuma fatia avança sem passar
por ela. O Princípio VII cobrou seu preço logo na fatia seguinte.

**Observação.** O resolvedor de templates exigiu um shim temporário de
`python3` para funcionar com o Python 3.14 instalado. Nenhum arquivo do projeto
foi alterado por esse contorno.

---

## 2 — Spec 000: plano técnico conjunto

**Objetivo.** Planejar as cinco fatias de uma vez, mantendo implementação uma
fatia por vez.

**Contexto.** As specs 001–005, a constituição e o scaffold existente
(Fastify + Vue + `better-sqlite3` + Drizzle).

**Instrução.** `$speckit-plan`, seguido de `$speckit-tasks`.

**Resultado.** `specs/000-project-plan/` com `plan.md`, `research.md`,
`data-model.md`, `contracts/api.md` e `quickstart.md`. Dez decisões técnicas
(R1–R10), cada uma com alternativas consideradas e o motivo da rejeição.
Geradas T001–T030 em oito fases.

**Validação.** O *Constitution Check* do plano reprovou o scaffold no Princípio
VII: `better-sqlite3` é addon C++ que compila via `node-gyp` quando não há
binário pré-compilado para a plataforma. Verifiquei que o Node 24.19 instalado
expõe `node:sqlite` (`DatabaseSync`) sem flag.

**Decisão.** **R1 — remover `better-sqlite3`, `drizzle-orm`, `drizzle-kit` e
`@fastify/cors`, substituindo por `node:sqlite` com SQL direto.** O risco de um
avaliador não conseguir subir a aplicação em clone limpo era inaceitável, e um
ORM com migrations não se paga para duas tabelas. Essa remediação virou
pré-requisito da fatia 001.

---

## 3 — Spec 001: fundação

**Objetivo.** Persistência real, seed idempotente e listagem funcionando.

**Contexto.** `specs/001-incident-hub-foundation/spec.md`.

**Instrução.** `$speckit-specify`, depois `$speckit-implement (T006–T011)`.

**Resultado.** `db/sqlite.ts` com `node:sqlite`, WAL e foreign keys; `seed.ts`;
bootstrap do servidor; `GET /incidents`; listagem inicial.

**Validação.** Testes de listagem, seed e estado vazio.

**Decisão.** **R5 — idempotência do seed por coluna `seed_key UNIQUE`, não por
título.** Deduplicar por título quebraria se um usuário criasse legitimamente um
incidente com o mesmo nome de um registro de exemplo. O seed grava direto o
status indicado, sem gerar histórico.

---

## 4 — Spec 002: criação de incidente

**Objetivo.** Criação com quatro campos obrigatórios e valores de sistema
protegidos.

**Contexto.** `specs/002-incident-creation/spec.md`.

**Instrução.** `$speckit-specify`, depois `$speckit-implement (T012–T016)`.

**Resultado.** `http/validation.ts`, `http/errors.ts`, `POST /incidents` e
`IncidentForm.vue`. O endpoint ignora `id`, `status` e datas enviados pelo
cliente, cria sempre em `Open` e não gera histórico.

**Validação.** Testes de campo ausente, campo vazio, enum inválido e
persistência do registro.

**Decisão.** **R8 — validação manual, sem biblioteca de schema.** As regras são
pequenas e as mensagens precisam nomear o campo em português; `ajv`/`zod`
adicionariam dependência e ainda exigiriam tradução customizada.

---

## 5 — Spec 003: regra de transição

**Objetivo.** Isolar a regra de negócio central antes de qualquer rota que a
consuma.

**Contexto.** `specs/003-status-transition-rules/spec.md`, que especifica a
matriz de 36 combinações incluindo a restrição `Critical: Open ↛ Resolved`.

**Instrução.** `$speckit-implement (T017–T018)` — criar a função pura e sua
matriz de testes, sem tocar em mais nada.

**Resultado.** `avaliarTransicao` em `domain/status-rules.ts`: função pura, sem
I/O, banco, rede ou framework.

**Validação.** 36/36 combinações verdes.

**Decisão.** Manter a regra em **um único arquivo**, consumido por import.
Rotas e UI não podem reimplementá-la. Foi decisão consciente colocar esta fatia
**antes** da rota que a usa (004), para que a rota nascesse consumindo uma
regra já provada em vez de embutir lógica que depois precisaria ser extraída.

---

## 6 — Spec 004: alteração de status, histórico e detalhe

**Objetivo.** Persistir transições com histórico auditável.

**Contexto.** `specs/004-status-change-detail/spec.md`.

**Instrução.** `$speckit-specify`, depois `$speckit-implement (T019–T022)`.

**Resultado.** `POST /incidents/:id/status` consumindo exclusivamente
`avaliarTransicao`; `GET /incidents/:id` com histórico cronológico;
`IncidentDetail.vue` com os campos, datas em pt-BR, histórico e a mensagem da
API nas recusas.

**Validação.** Testes de 422 sem efeitos colaterais, 404 para id inexistente e
histórico somente-adição.

**Decisão.** **R7 — `UPDATE` do incidente e `INSERT` no histórico dentro de uma
única transação SQL** (`BEGIN`/`COMMIT` com rollback). Duas operações
independentes deixariam uma janela em que o status já mudou mas o histórico
ainda não existe.

---

## 7 — Spec 005: filtros e dashboard

**Objetivo.** Filtros combináveis e os três contadores do enunciado.

**Contexto.** `specs/005-filters-dashboard/spec.md`.

**Instrução.** `$speckit-specify`, depois `$speckit-implement (T023–T027)`.

**Resultado.** `GET /incidents` com `status` e `severity` em interseção e
rejeição explícita de valor inválido; `GET /dashboard` com `open`,
`criticalUnresolved` e `resolved`.

**Validação.** Testes de interseção, estados vazios e a sequência numérica
1/1/1 → 0/1/1 → 0/0/2 conforme as transições ocorrem.

**Decisão.** Duas decisões deliberadas contra o comportamento "natural":
**`Critical` não resolvido conta também em `In Progress`** — um incidente
crítico em tratamento continua não resolvido, e contar só `Open` seria o erro
óbvio aqui; e **filtro com valor inválido retorna erro em vez de lista vazia** —
lista vazia silenciosa faria o usuário concluir que não existem incidentes
daquele tipo.

---

## 8 — Spec 006: quadro Kanban

**Objetivo.** Tornar a operação mais direta: mudar status sem abrir cada
incidente.

**Contexto.** `specs/006-kanban-board/spec.md` e seu checklist.

**Instrução.** `$speckit-specify`, depois `$speckit-implement (T031–T034)`.

**Resultado.** `KanbanBoard.vue` substituindo a listagem linear: colunas
`Open`/`In Progress`/`Resolved` com contadores, cards com destaque por
severidade, botões de transição inline, bloqueio durante a requisição e
feedback de recusa no próprio card. `App.vue` atualiza o quadro após criação e
mudanças no detalhe; `api.ts` extrai a mensagem de `{ error }`.

**Validação.** Testado via Docker: `Critical` `Open → Resolved` foi bloqueado
com mensagem no card; `Open → In Progress → Resolved` moveu o card e atualizou
o dashboard sem reload. Suíte e builds verdes.

**Decisão.** Substituir a lista pelo quadro — ver *mudança de estratégia* na
seção final.

---

## 9 — Auditoria contra o enunciado

**Objetivo.** Antes de escrever o `FINAL_REPORT`, verificar se o que eu
acreditava estar pronto realmente estava — em vez de confiar na minha memória
do que tinha sido implementado.

**Contexto.** Forneci à IA o `Hackathon Instructions.md` completo e dei acesso
ao repositório inteiro: código, testes, specs, histórico Git e documentos.

**Instrução.** Comparar cada requisito do enunciado contra o estado real do
repositório e apontar divergências, sem assumir que a documentação existente
estivesse correta.

**Resultado.** A auditoria encontrou lacunas em três níveis:

- **Entregáveis** — `PLAN.md` e `FINAL_REPORT.md` inexistentes; `README.md` sem
  quatro das sete seções exigidas pela §19.
- **Funcional** — o filtro por status existia e era testado na API, mas não
  tinha controle próprio na interface, onde o status virara apenas coluna do
  quadro.
- **Prova** — dois problemas sérios descritos na seção final: um teste que
  passava sem verificar nada, e uma cobertura de reinício que a documentação
  afirmava existir e não existia.

**Validação.** Cada achado foi confirmado no repositório antes de virar tarefa:
`git log --diff-filter=A` para os arquivos, leitura dos testes para a cobertura,
`grep` nos componentes para o filtro. Um dos achados iniciais da IA sobre o
caminho do banco (`rm -rf data/`) estava errado e foi corrigido rodando
`npm run seed` e localizando o arquivo real em `apps/api/data/`.

**Decisão.** Tratar as lacunas na ordem da §22 — requisitos obrigatórios
implementados, funcionando, testados e documentados antes de qualquer coisa
nova. Criados `PLAN.md`, `ACCEPTANCE.md` (rastreabilidade requisito → código →
teste) e o README completo; adicionado o seletor de status na UI.

---

## 10 — Fechamento das lacunas de teste

**Objetivo.** Converter em prova automatizada os dois requisitos que estavam
apenas verificáveis manualmente.

**Contexto.** `ACCEPTANCE.md` com as lacunas mapeadas, `test/helpers.ts` e a
suíte existente.

**Instrução.** Escrever um teste de reinício real de processo e corrigir a
asserção do seed, sem alterar o comportamento da aplicação.

**Resultado.** `persistence.test.ts` cria um incidente, faz a transição
`Open → Resolved`, encerra o subprocesso do servidor e inicia outro apontando
para o mesmo arquivo SQLite, exigindo status e histórico intactos.
`seed.test.ts` passou a consultar o detalhe de cada incidente seedado e exigir
`history: []`. `test/helpers.ts` recebeu `stop()` idempotente.

**Validação.** `npm test` = **13/13 verde**, com o teste de persistência em
1,25s. `ACCEPTANCE.md` foi de três lacunas conhecidas para zero.

**Decisão.** Documentar em `ACCEPTANCE.md` a régua adotada: um requisito só
conta como concluído quando existe teste que falharia se ele quebrasse.

---

# Situações exigidas pela §18

## A IA produziu algo incorreto

**Um teste verde que não testava nada.** O `seed.test.ts` pretendia provar que
o seed não gera histórico. Fazia isto:

```ts
const statusChanges = await fetch(`${server.baseUrl}/incidents/1/status-history`);
assert.equal(statusChanges.status, 404);
```

A rota `/incidents/:id/status-history` **nunca existiu na API**. O 404 vinha de
rota inexistente, não de ausência de histórico — a asserção passaria mesmo que
o seed gravasse mil registros. Ficou verde desde a fatia 001 sem nunca ter
verificado o requisito.

Este é o pior tipo de defeito que encontrei no projeto, porque produz confiança
falsa: a suíte reportava cobertura de um requisito que não estava coberto.

**Uma segunda ocorrência, na documentação.** Ao escrever o `README.md` e o
`PLAN.md`, a IA descreveu a suíte como tendo um teste de reinício de processo,
copiando essa afirmação do próprio `AI_LOG` em vez de conferir os arquivos.
Nenhum dos sete testes de integração fazia isso — todos seguiam
`startServer` no `before` e `stop` no `after`, sem nunca reiniciar. A
documentação afirmava cobertura inexistente.

## Como identifiquei

Não foi lendo o código de teste — foi tentando montar o `ACCEPTANCE.md`.
Ao exigir de cada requisito um par *critério → linha de teste que o prova*, os
dois casos apareceram sozinhos: no seed, a linha apontava para uma rota que eu
não encontrava em `routes/incidents.ts`; no reinício, simplesmente não havia
linha para apontar.

A régua "qual teste falharia se isso quebrasse?" é o que expôs ambos. Um
checklist de "está implementado?" teria passado batido nos dois.

## Regressão

O primeiro `persistence.test.ts` **pendurou a suíte inteira**. O que rodava em
~4 segundos passou de 180 segundos sem terminar; isolado, o teste rodou 51
segundos e morreu por timeout.

Causa: `firstServer.stop()` era chamado dentro do `try` e novamente no
`finally`. O `stop()` original fazia `child.kill()` seguido de
`await once(child, 'exit')` — na segunda chamada o processo já havia morrido, o
evento `exit` não dispararia outra vez, e o `await` ficava pendurado
indefinidamente. O `.catch()` não ajudava: a promise não rejeitava, apenas
nunca resolvia.

Identificada rodando o teste isolado com `timeout` e comparando a duração com
a dos demais. Corrigida tornando o `stop()` idempotente em `test/helpers.ts` —
solução preferida a remover a chamada duplicada, porque protege qualquer teste
futuro que caia no mesmo padrão. Validada com `npm test`: 13/13 em 3 segundos.

## Abordagens abandonadas

- **`better-sqlite3` + Drizzle**, herdados do scaffold, removidos na fatia 001
  por violarem o Princípio VII (compilação nativa). Substituídos por
  `node:sqlite`.
- **Listagem linear**, substituída pelo quadro Kanban na fatia 006. A API e o
  contrato foram preservados; só a camada de apresentação mudou.
- **`@fastify/cors`**, removido: o front usa caminho relativo `/api`, resolvido
  por proxy do Vite em dev e por nginx em container. Same-origin nos dois
  modos torna o plugin desnecessário.

## Sugestões da IA que rejeitei ou alterei

- **Manter as dependências do scaffold.** O caminho de menor esforço era seguir
  com `better-sqlite3` e Drizzle, que já estavam configurados e funcionando na
  minha máquina. Rejeitei porque "funciona aqui" não é o critério — o
  requisito é reprodução a partir do repositório, e um addon C++ quebra isso em
  qualquer máquina sem binário pré-compilado.
- **Vitest para os testes.** Rejeitado: a cobertura necessária é de
  comportamento, não de framework, e `node:test` já vem no runtime.
- **`vue-router`.** Rejeitado: a aplicação é uma página só, sem navegação real.
- **Dedupe do seed por título.** Rejeitado em favor de `seed_key`, para não
  quebrar quando um usuário criar um incidente com o mesmo título de um
  registro de exemplo.
- **Remover a chamada duplicada de `stop()`** como correção da regressão.
  Alterei para tornar o `stop()` idempotente: corrige a causa em vez do
  sintoma, e vale para qualquer teste futuro.
- **A redação da nota de abertura do `PLAN.md`** passou por três versões até
  descrever com precisão o que ocorreu — a confusão entre o `plan.md` que o
  Spec Kit gera e o `PLAN.md` que o enunciado pede.

## Contexto adicional que precisei fornecer

- **O enunciado completo.** Enquanto a IA trabalhava só com as specs internas,
  ela avaliava o projeto contra a minha própria decomposição — que já embutia
  minhas suposições. Fornecer o `Hackathon Instructions.md` original foi o que
  revelou as lacunas de entregáveis e de seções do README.
- **A causa real da ausência do `PLAN.md`.** A IA só conseguiu redigir a nota
  correta depois que expliquei que eu havia tratado o `plan.md` do Spec Kit
  como o plano exigido.
- **Correção sobre o caminho do banco.** A IA documentou o reset como
  `rm -rf data/`; o `SQLITE_PATH` é relativo ao diretório da API, então o
  arquivo real fica em `apps/api/data/`. Detectado rodando `npm run seed` e
  localizando o arquivo.

## Mudanças de estratégia

- **Da lista para o quadro.** A listagem linear cumpria o requisito §5, mas
  exigia abrir cada incidente para mudar status. O Kanban tornou a operação
  direta e deu ao status uma representação visual. A API não mudou.
- **De "implementado" para "provado".** Até a fatia 006 eu media progresso por
  funcionalidade entregue. A auditoria mudou a régua para evidência
  automatizada, e foi essa mudança que produziu o `ACCEPTANCE.md` e revelou os
  dois defeitos de teste.
- **Reexpor o filtro de status na UI.** Ao virar Kanban, o status deixou de ter
  controle próprio e passou a ser só coluna. Defensável pelo enunciado, que
  deixa a apresentação a critério do candidato — mas a auditoria mostrou que um
  avaliador procurando o controle poderia não creditar o requisito. Adicionado
  o seletor, combinável com o de severidade.
