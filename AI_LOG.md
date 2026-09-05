# AI_LOG.md

Registro das interações com IA relevantes para entender como esta solução foi
construída.

**Sobre quando cada parte foi escrita.** As entradas 1 a 8 foram anotadas
durante o trabalho, ao fim de cada fatia, e eram notas curtas. As entradas 9 a
11 e a seção final foram escritas depois da auditoria contra o enunciado, já no
período da tarde, olhando para trás — inclusive porque parte do que elas
registram só ficou visível naquela revisão. O `git log` mostra essas datas.

As entradas seguem a estrutura Objetivo / Contexto / Instrução / Resultado /
Validação / Decisão. Situações de erro, regressão e rejeição de sugestão estão
reunidas na seção final.

Fluxo de trabalho: Spec Kit. Cada fatia começa por uma spec com critérios de
aceite (`$speckit-specify`), passa por plano (`$speckit-plan`), tarefas
(`$speckit-tasks`) e implementação (`$speckit-implement`). Quando a entrada cita
"instrução", é esse comando mais o contexto descrito.

---

## 1 — Constituição

**Objetivo.** Ter regras fixas antes de escrever código.

**Contexto.** Enunciado do desafio e o scaffold inicial.

**Instrução.** `$speckit-constitution`.

**Resultado.** `.specify/memory/constitution.md` v1.0.0, oito princípios. Os que
pesaram: III (regra de transição pura e centralizada), IV (histórico
somente-adição), V (testes por fatia) e VII (nada que exija compilação nativa).

**Validação.** Revisão manual dos princípios contra os requisitos, checando que
nenhum criava trabalho fora do escopo.

**Decisão.** Usar a constituição como gate de cada fatia.

Nota: o resolvedor de templates pediu um shim de `python3` para rodar com o
Python 3.14. Contorno temporário, nenhum arquivo do projeto alterado.

---

## 2 — Spec 000: plano técnico

**Objetivo.** Planejar as cinco fatias de uma vez, implementando uma por vez.

**Contexto.** Specs 001–005, constituição e o scaffold (Fastify, Vue,
`better-sqlite3`, Drizzle).

**Instrução.** `$speckit-plan` e depois `$speckit-tasks`.

**Resultado.** `specs/000-project-plan/` com plano, research (R1–R10),
data-model, contrato da API e quickstart. T001–T030 em oito fases.

**Validação.** O Constitution Check reprovou o scaffold no princípio VII:
`better-sqlite3` é addon C++ e compila via `node-gyp` quando não há binário
pronto. Conferi que o Node 24.19 já expõe `node:sqlite`.

**Decisão.** R1: remover `better-sqlite3`, `drizzle-orm`, `drizzle-kit` e
`@fastify/cors`, usando `node:sqlite` com SQL direto. O risco de o avaliador
não conseguir subir a aplicação era grande demais. Virou pré-requisito da
fatia 001.

---

## 3 — Spec 001: fundação

**Objetivo.** Persistência, seed idempotente e listagem.

**Instrução.** `$speckit-specify`, depois `$speckit-implement (T006–T011)`.

**Resultado.** `db/sqlite.ts` com `node:sqlite`, WAL e foreign keys. `seed.ts`,
bootstrap do servidor, `GET /incidents`, listagem.

**Validação.** Testes de listagem, seed e estado vazio.

**Decisão.** R5: idempotência do seed por coluna `seed_key UNIQUE`. Deduplicar
por título quebraria se alguém criasse um incidente com o mesmo nome de um
registro de exemplo.

---

## 4 — Spec 002: criação

**Objetivo.** Quatro campos obrigatórios e valores de sistema protegidos.

**Instrução.** `$speckit-specify`, depois `$speckit-implement (T012–T016)`.

**Resultado.** `validation.ts`, `errors.ts`, `POST /incidents`,
`IncidentForm.vue`. O endpoint ignora `id`, `status` e datas do cliente, cria
sempre em `Open`, não gera histórico.

**Validação.** Testes de campo ausente, vazio, enum inválido e persistência.

**Decisão.** R8: validação manual, sem lib de schema. As regras são poucas e as
mensagens precisam nomear o campo em português.

---

## 5 — Spec 003: regra de transição

**Objetivo.** Isolar a regra antes de qualquer rota que a use.

**Instrução.** `$speckit-implement (T017–T018)` — só a função pura e a matriz,
sem tocar em mais nada.

**Resultado.** `avaliarTransicao` em `domain/status-rules.ts`, sem I/O.

**Validação.** 36/36 combinações verdes.

**Decisão.** Colocar esta fatia antes da rota que a consome (004), para a rota
nascer usando uma regra já testada em vez de embutir lógica que depois
precisaria ser extraída.

---

## 6 — Spec 004: status, histórico e detalhe

**Objetivo.** Persistir transições com histórico auditável.

**Instrução.** `$speckit-specify`, depois `$speckit-implement (T019–T022)`.

**Resultado.** `POST /incidents/:id/status` usando só `avaliarTransicao`,
`GET /incidents/:id` com histórico cronológico, `IncidentDetail.vue`.

**Validação.** Testes de 422 sem efeito colateral, 404 e histórico
somente-adição.

**Decisão.** R7: `UPDATE` do incidente e `INSERT` no histórico na mesma
transação SQL. Separado, existiria uma janela com status novo e histórico
ainda ausente.

---

## 7 — Spec 005: filtros e dashboard

**Objetivo.** Filtros combináveis e os três contadores.

**Instrução.** `$speckit-specify`, depois `$speckit-implement (T023–T027)`.

**Resultado.** `GET /incidents` com `status` e `severity` em interseção;
`GET /dashboard` com os três números.

**Validação.** Testes de interseção, estados vazios e a sequência
1/1/1 → 0/1/1 → 0/0/2.

**Decisão.** Duas escolhas contra o comportamento óbvio. `Critical` não
resolvido conta também em `In Progress`, porque um crítico em tratamento
continua não resolvido. E filtro com valor inválido retorna erro em vez de
lista vazia, que faria o usuário concluir que não há incidentes daquele tipo.

---

## 8 — Spec 006: quadro Kanban

**Objetivo.** Mudar status sem precisar abrir cada incidente.

**Instrução.** `$speckit-specify`, depois `$speckit-implement (T031–T034)`.

**Resultado.** `KanbanBoard.vue` no lugar da listagem: três colunas com
contadores, cards com cor por severidade, botões de transição inline, bloqueio
durante a requisição e mensagem de recusa no próprio card.

**Validação.** Testado no Docker. `Critical` `Open → Resolved` bloqueado com
mensagem no card; `Open → In Progress → Resolved` moveu o card e atualizou o
dashboard sem reload.

---

## 9 — Auditoria contra o enunciado

**Objetivo.** Antes de escrever o `FINAL_REPORT`, conferir se o que eu achava
que estava pronto estava mesmo, em vez de confiar na minha memória.

**Contexto.** Passei o `Hackathon Instructions.md` inteiro e dei acesso ao
repositório: código, testes, specs, histórico Git e documentos.

**Instrução.** Comparar cada requisito do enunciado com o estado real do
repositório, sem assumir que a documentação existente estivesse correta.

**Resultado.** Lacunas em três níveis:

- Entregáveis: `PLAN.md` e `FINAL_REPORT.md` não existiam, e o `README.md`
  estava sem quatro das sete seções da §19.
- Funcional: o filtro por status existia e era testado na API, mas não tinha
  controle na interface — virara só coluna do quadro.
- Prova: dois problemas sérios, descritos na seção final.

**Validação.** Confirmei cada achado antes de virar tarefa: `git log` para os
arquivos, leitura dos testes para a cobertura, `grep` nos componentes para o
filtro. Um achado da IA sobre o caminho do banco (`rm -rf data/`) estava errado;
rodei `npm run seed` e o arquivo real estava em `apps/api/data/`.

**Decisão.** Seguir a ordem da §22: requisito obrigatório implementado,
funcionando, testado e documentado antes de qualquer coisa nova. Criei
`PLAN.md` e `ACCEPTANCE.md`, completei o README e adicionei o seletor de status.

---

## 10 — Fechamento das lacunas de teste

**Objetivo.** Transformar em teste os dois requisitos que só dava para
verificar na mão.

**Instrução.** Escrever um teste de reinício real de processo e corrigir a
asserção do seed, sem mudar o comportamento da aplicação.

**Resultado.** `persistence.test.ts` cria incidente, faz transição, mata o
subprocesso e sobe outro no mesmo arquivo SQLite. `seed.test.ts` passou a
consultar o detalhe de cada incidente do seed e exigir `history: []`.
`helpers.ts` ganhou `stop()` idempotente.

**Validação.** `npm test` 13/13 verde. `ACCEPTANCE.md` foi de três lacunas
para zero.

**Decisão.** Fixar em `ACCEPTANCE.md` a régua: requisito só conta como pronto
quando existe teste que falharia se ele quebrasse.

---

## 11 — Change Request #1: comentários e timeline

**Objetivo.** Incorporar o Change Request das 14:00 sem quebrar o que já estava
concluído.

**Contexto.** Texto integral do Change Request, o repositório com as seis
fatias implementadas, o `ACCEPTANCE.md` e a constituição.

**Instrução.** Seguir o mesmo rito em vez de improvisar por causa da pressa:
spec primeiro (`specs/007-comments-timeline/spec.md`), implementação depois,
documentação por último. Tratar o §4 do CR (compatibilidade) como restrição de
projeto, não como conferência no fim.

**Resultado.** Tabela `comments`, `validateCommentBody`,
`POST /incidents/:id/comments`, `GET /incidents/:id` estendido com `comments` e
`timeline`. No front, formulário e timeline em `IncidentDetail.vue`. Nove testes
novos.

**Validação.** Três camadas. `npm test` 22/22, com os 13 testes anteriores
passando sem edição nenhuma. `npm run build` verde, incluindo o `vue-tsc`, que
valida o uso da união discriminada no template. E a aplicação rodando:
comentário criado com trim, recusa de conteúdo só com espaços aparecendo na
tela, 404 para incidente inexistente, `Critical Open → Resolved` ainda
bloqueado, e a timeline em ordem.

**Decisão.** Manter a mudança aditiva: preservar `history` no contrato em vez de
trocar por `timeline`. Trocar seria mais limpo, mas obrigaria a reescrever
testes existentes, e aí "a suíte continua verde" não provaria nada.

Durante a validação manual a rota nova respondeu 404 e por um momento pareceu
defeito de roteamento. Não era: três processos antigos ainda ocupavam a porta
3000 e o `curl` falava com um servidor anterior à mudança. Percebi porque o
health-check respondeu em 1 segundo, rápido demais para um boot real. Matei os
processos e subi limpo. Nenhuma alteração de código.

---

# Situações exigidas pela §18

## A IA produziu algo incorreto

Um teste verde que não testava nada. O `seed.test.ts` deveria provar que o seed
não gera histórico, e fazia isto:

```ts
const statusChanges = await fetch(`${server.baseUrl}/incidents/1/status-history`);
assert.equal(statusChanges.status, 404);
```

A rota `/incidents/:id/status-history` nunca existiu na API. O 404 vinha de rota
inexistente, não de ausência de histórico. A asserção passaria mesmo que o seed
gravasse mil registros. Ficou verde desde a fatia 001 sem nunca verificar o
requisito.

Foi o defeito mais sério que apareceu, porque a suíte reportava cobertura de um
requisito que não estava coberto.

Houve uma segunda ocorrência, na documentação. Ao escrever o README e o PLAN, a
IA descreveu a suíte como tendo teste de reinício de processo, copiando a
afirmação do próprio AI_LOG em vez de conferir os arquivos. Nenhum dos sete
testes de integração fazia isso: todos usavam `startServer` no `before` e
`stop` no `after`, sem reiniciar nada.

## Como identifiquei

Não foi lendo o código de teste. Foi montando o `ACCEPTANCE.md`.

Ao exigir de cada requisito um par "critério → linha de teste que prova", os
dois casos apareceram sozinhos. No seed, a linha apontava para uma rota que eu
não achava em `routes/incidents.ts`. No reinício, não havia linha nenhuma para
apontar.

A pergunta que expôs os dois foi "qual teste falharia se isso quebrasse?". Um
checklist de "está implementado?" teria passado batido.

## Como corrigi e validei

No seed, troquei a consulta pela rota inexistente por `GET /incidents/:id`,
exigindo `history: []` em cada um dos três incidentes do seed. No reinício,
escrevi `persistence.test.ts`, que sobe o servidor, cria incidente e histórico,
mata o processo e sobe outro apontando para o mesmo arquivo.

Validação: 13/13 verde, e o `ACCEPTANCE.md` saiu de três lacunas para zero.

## Regressão

O primeiro `persistence.test.ts` travou a suíte inteira. O que rodava em ~4
segundos passou de 180 sem terminar. Isolado, o teste rodou 51 segundos e morreu
por timeout.

Causa: `firstServer.stop()` era chamado no `try` e de novo no `finally`. O
`stop()` fazia `child.kill()` e depois `await once(child, 'exit')`. Na segunda
chamada o processo já tinha morrido, o evento `exit` não dispararia outra vez, e
o `await` ficava pendurado. O `.catch()` não resolvia, porque a promise não
rejeitava — só nunca resolvia.

Achei rodando o teste isolado com `timeout` e comparando a duração com a dos
outros. Corrigi tornando o `stop()` idempotente em `helpers.ts`, em vez de só
tirar a chamada duplicada, porque assim protege qualquer teste futuro que caia
no mesmo padrão. Depois: 13/13 em 3 segundos.

## Abordagens abandonadas

- `better-sqlite3` e Drizzle, herdados do scaffold, removidos na fatia 001 por
  causa do princípio VII. Substituídos por `node:sqlite`.
- Listagem linear, substituída pelo quadro Kanban na fatia 006. A API não mudou.
- `@fastify/cors`, removido. O front usa caminho relativo `/api`, com proxy do
  Vite em dev e nginx em container. Same-origin nos dois casos.

## Sugestões da IA que rejeitei ou alterei

- Manter as dependências do scaffold. Era o caminho mais fácil, já estava
  funcionando na minha máquina. Rejeitei porque "funciona aqui" não é o
  critério: o requisito é reproduzir a partir do repositório, e um addon C++
  quebra isso em qualquer máquina sem binário pronto.
- Vitest. Rejeitado, `node:test` já vem no runtime.
- `vue-router`. Rejeitado, a aplicação é uma página só.
- Dedupe do seed por título. Trocado por `seed_key`.
- Remover a chamada duplicada de `stop()` como correção da regressão. Alterei
  para tornar o `stop()` idempotente, que corrige a causa e não o sintoma.
- A nota de abertura do `PLAN.md` passou por três versões até descrever direito
  o que aconteceu: a confusão entre o `plan.md` que o Spec Kit gera e o
  `PLAN.md` que o enunciado pede.

## Contexto adicional que precisei fornecer

- O enunciado completo. Enquanto a IA trabalhava só com as specs internas, ela
  avaliava o projeto contra a minha própria decomposição, que já tinha as
  minhas suposições embutidas. Passar o `Hackathon Instructions.md` original foi
  o que revelou as lacunas de entregáveis e de README.
- A causa real da ausência do `PLAN.md`. A nota só ficou correta depois que
  expliquei que eu tinha tratado o `plan.md` do Spec Kit como o plano exigido.
- Correção sobre o caminho do banco. A IA documentou o reset como
  `rm -rf data/`; o `SQLITE_PATH` é relativo ao diretório da API, então o
  arquivo fica em `apps/api/data/`.

## Mudanças de estratégia

- Da lista para o quadro. A listagem cumpria o §5, mas exigia abrir cada
  incidente para mudar status.
- De "implementado" para "provado". Até a fatia 006 eu media progresso por
  funcionalidade entregue. A auditoria mudou a régua para evidência
  automatizada, e foi isso que produziu o `ACCEPTANCE.md` e achou os dois
  defeitos de teste.
- Reexpor o filtro de status na UI. Ao virar Kanban, o status virou só coluna.
  É defensável pelo enunciado, que deixa a apresentação a critério do
  candidato, mas um avaliador procurando o controle poderia não creditar o
  requisito.
- Absorver o Change Request sem largar o rito. A reação natural a uma mudança
  às 14:00, com freeze às 17:40, é ir direto ao código. Mantive spec antes e
  documentação depois. Custou alguns minutos e fez as decisões difíceis
  (contrato aditivo, timeline derivada, `updatedAt` inalterado) ficarem
  registradas em vez de viverem só no código.
- De "não quebrar" para "provar que não quebrou". O §4 do CR pede que a mudança
  não comprometa o que funcionava. Em vez de tratar como cuidado ao editar,
  tratei como restrição: o contrato ficou aditivo justamente para a suíte
  anterior rodar sem edição e servir de evidência.
