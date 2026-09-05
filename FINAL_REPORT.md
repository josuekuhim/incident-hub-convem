# FINAL_REPORT.md — Incident Hub

**Josué Kuhim** · 2026-09-05

Suíte final: `npm test` — 22 testes, 22 verdes.
Rastreabilidade requisito → código → teste: [`ACCEPTANCE.md`](ACCEPTANCE.md).

> **Sobre a redação deste documento.** O conteúdo — decisões, diagnósticos,
> avaliações e escolhas de escopo — é meu. Utilizei IA de chat para melhorar a
> redação do que escrevi: organizar a estrutura, ajustar clareza e revisar o
> texto. Os fatos citados são verificáveis no repositório: código, testes,
> histórico Git e `ACCEPTANCE.md`.
>
> Este relatório e o `AI_LOG.md` foram commitados mais de uma vez ao longo da
> tarde, conforme eu revisava a aplicação e encontrava coisas a corrigir. O
> histórico Git mostra essas versões — a evolução dos dois documentos faz parte
> do registro do processo, não é retrabalho escondido.

---

## 1. O que foi entregue?

Todos os requisitos do enunciado original e o Change Request #1.

**Incidentes.** Modelo com identificador, título, descrição, severidade,
responsável, status e as duas datas. Os enums são garantidos por `CHECK`
constraint no banco, não só na aplicação. Criação com os quatro campos
obrigatórios, sempre em `Open`, com `id` e timestamps definidos pelo servidor —
valores enviados pelo cliente nesses campos são descartados.

**Visualização.** Quadro Kanban com três colunas por status, contadores por
coluna, cor por severidade e transição inline sem recarregar a página. Filtros
por status e por severidade, combináveis. Tela de detalhe com os sete campos.

**Regra de negócio.** `Critical` não passa de `Open` direto para `Resolved`. A
regra vive em uma função pura, em um único arquivo, sem I/O — rotas e interface
apenas a consomem. A recusa retorna 422 com mensagem compreensível e não produz
efeito nenhum: status, `updatedAt` e histórico ficam intactos.

**Histórico e timeline.** Toda transição aceita grava exatamente um registro,
na mesma transação SQL do `UPDATE`. Após o Change Request, a tela de detalhe
apresenta uma timeline cronológica única reunindo alterações de status e
comentários.

**Comentários** (Change Request #1). Autor e conteúdo obrigatórios, recusa de
vazio e de espaços em branco, data/hora pelo servidor, múltiplos comentários
por incidente, persistidos.

**Dashboard.** Abertos, `Critical` não resolvidos e resolvidos, sempre a partir
dos dados atuais. `Critical` não resolvido conta tanto em `Open` quanto em
`In Progress`.

**Persistência.** SQLite via `node:sqlite`, sem dependência nativa. Sobrevive a
reload da página e a reinício do processo, com teste automatizado que sobe o
servidor como subprocesso, mata e sobe outro no mesmo arquivo.

**Dados iniciais.** Os três incidentes do enunciado, criados no boot da API.
Seed idempotente por `seed_key`, sem gerar histórico.

**Execução.** `npm install && npm run dev`, ou `docker compose up --build`.

---

## 2. O que não foi entregue?

- **Testes automatizados de front-end.** Nenhum. Toda a verificação de interface
  foi manual. É a maior ausência da entrega.
- **Prova automatizada de atomicidade da transação.** O `UPDATE` e o `INSERT`
  do histórico rodam em uma transação SQL, mas não há teste que injete falha no
  meio para provar o rollback.

Dois itens que constavam aqui foram corrigidos antes do code freeze, depois de
aparecerem na auditoria:

- **`GET /seed` foi removido.** O endpoint executava o seed via `tsx`, que não
  existe no build de produção — quebrava dentro do container. Era redundante,
  porque o seed já roda no boot da API. Com a remoção, `seed.test.ts` passou a
  executar `src/seed.ts` diretamente, o que testa o módulo real em vez de um
  invólucro HTTP.
- **Os artefatos `tsconfig.*.tsbuildinfo` saíram do versionamento**, via
  `.gitignore` e `git rm --cached`. Só o `.gitignore` não bastava: os arquivos
  já estavam rastreados, e regra de ignore não afeta arquivo já versionado. Eram
  dois — `tsconfig.app` e `tsconfig.node` — e o segundo só apareceu ao conferir
  o `git ls-files` depois de remover o primeiro.

---

## 3. O que você deliberadamente decidiu não fazer?

**Edição e exclusão de incidentes.** O enunciado pede criação, leitura e
mudança de status. Edição livre enfraqueceria a auditabilidade que o histórico
existe para garantir.

**Edição e exclusão de comentários**, pelo mesmo motivo, após o Change Request.

**ORM e migrations.** Duas tabelas — depois três — não pagam a complexidade.
`CREATE TABLE IF NOT EXISTS` no boot resolve, inclusive a criação da tabela de
comentários em bancos que já existiam.

**Busca textual, paginação e ordenação configurável.** Fora do escopo pedido e
desnecessárias no volume esperado.

**`vue-router`.** A aplicação é uma página só. Não há navegação real a rotear.

**Drag-and-drop no Kanban.** Botões explícitos de transição são mais acessíveis
e muito mais baratos de testar.

**Autenticação.** Dispensada explicitamente pelo enunciado.

A régua em todos os casos foi a §22: extra não compensa obrigatório fraco.

---

## 4. Quais foram as três principais decisões técnicas?

**1. Trocar `better-sqlite3` por `node:sqlite`.** O scaffold trazia
`better-sqlite3`, `drizzle-orm` e `drizzle-kit`. `better-sqlite3` é um addon
C++ que compila via `node-gyp` quando não existe binário pronto para a
plataforma. Isso colocava em risco o requisito mais básico do desafio — que
outra pessoa consiga rodar a solução a partir do repositório. `node:sqlite` é
biblioteca padrão do Node 24: sem instalação, sem compilação. Os três pacotes
saíram.

**2. A regra de transição isolada em uma função pura, antes da rota que a usa.**
`domain/status-rules.ts` não conhece banco, HTTP nem framework. Implementei a
fatia da regra (003) antes da fatia da rota (004), de propósito, para a rota
nascer consumindo algo já testado em vez de embutir lógica que depois
precisaria ser extraída. Isso permitiu cobrir as 36 combinações de severidade e
status sem subir nada, e garante que não exista caminho alternativo capaz de
contornar a restrição do `Critical`. A interface exibe a mensagem da API
verbatim, nunca reescreve a regra.

**3. Manter o Change Request aditivo no contrato da API.** Ao adicionar a
timeline, o caminho mais limpo seria substituir `history` por `timeline` em
`GET /incidents/:id`. Preferi manter `history` e acrescentar `comments` e
`timeline`. O motivo não foi estético: com o contrato aditivo, os 13 testes que
existiam naquele momento rodaram sem uma linha de alteração. O §4 do Change Request pede que
a mudança não comprometa o que já funcionava, e assim a suíte verde vira
evidência disso em vez de coincidência.

---

## 5. Qual foi o maior erro produzido pela IA durante o desenvolvimento?

Um teste que passava sem verificar nada.

O `seed.test.ts` deveria provar que o seed não gera histórico de status. Fazia
assim:

```ts
const statusChanges = await fetch(`${server.baseUrl}/incidents/1/status-history`);
assert.equal(statusChanges.status, 404);
```

A rota `/incidents/:id/status-history` nunca existiu na API. O 404 vinha de rota
inexistente, não de ausência de histórico. A asserção passaria mesmo que o seed
gravasse mil registros.

Ficou verde desde a fatia 001. O problema não é o teste ter falhado — é ele ter
passado, reportando cobertura de um requisito que não estava coberto. Confiança
falsa é pior do que ausência de teste, porque impede de procurar.

Houve uma segunda ocorrência, na documentação: ao escrever o README e o PLAN, a
IA afirmou que a suíte tinha teste de reinício de processo, copiando isso do
próprio `AI_LOG` em vez de conferir os arquivos. Nenhum dos sete testes de
integração reiniciava nada.

---

## 6. Como você identificou esse erro?

Não foi lendo o código de teste. Foi construindo o `ACCEPTANCE.md`.

Decidi montar uma matriz ligando cada requisito do enunciado ao código que o
implementa e à **linha de teste que o prova**. Foi essa exigência que expôs os
dois casos. No seed, a linha apontava para uma rota que eu não encontrava em
`routes/incidents.ts`. No reinício, simplesmente não havia linha para apontar —
todos os testes de integração usavam `startServer` no `before` e `stop` no
`after`, sem nunca reiniciar.

A pergunta que funcionou foi "qual teste falharia se isso quebrasse?". Um
checklist de "está implementado?" teria dado tudo verde.

---

## 7. Como você corrigiu e validou a correção?

No seed, substituí a consulta à rota inexistente por `GET /incidents/:id`,
exigindo `history: []` em cada um dos três incidentes criados pelo seed —
verificação que olha o dado, não o código HTTP de uma rota que não existe.

No reinício, escrevi `persistence.test.ts`: sobe o servidor como subprocesso,
cria um incidente, faz uma transição, mata o processo e sobe outro apontando
para o mesmo arquivo SQLite, exigindo incidente e histórico intactos.
Reimportar o módulo de banco no mesmo processo não serviria — o cache de
módulos do ESM mascararia o defeito.

Validação: `npm test` passou de 12 para 13 testes, todos verdes, e o
`ACCEPTANCE.md` saiu de três lacunas conhecidas para zero. Confirmei também na
aplicação rodando, com `curl` no detalhe de um incidente do seed.

---

## 8. Houve alguma regressão?

Sim, uma, e foi causada pela própria correção acima.

A primeira versão do `persistence.test.ts` travou a suíte inteira. O que rodava
em cerca de 4 segundos passou de 180 sem terminar. Rodando o teste isolado com
`timeout`, ele consumiu 51 segundos e morreu.

A causa: `firstServer.stop()` era chamado dentro do `try` e de novo no
`finally`. O `stop()` fazia `child.kill()` seguido de `await once(child,
'exit')`. Na segunda chamada o processo já tinha morrido, o evento `exit` não
dispararia outra vez, e o `await` ficava pendurado para sempre. O `.catch()` não
ajudava, porque a promise não rejeitava — apenas nunca resolvia.

Identifiquei comparando a duração do teste isolado com a dos outros: 51 segundos
contra 2. Corrigi tornando o `stop()` idempotente em `test/helpers.ts`, em vez
de apenas remover a chamada duplicada. Assim a correção protege qualquer teste
futuro que caia no mesmo padrão, em vez de tratar só o sintoma. Depois: 13/13 em
3 segundos.

---

## 9. Em qual parte houve mais retrabalho?

Na camada de apresentação.

A listagem linear da fatia 001 foi substituída pelo quadro Kanban na fatia 006.
Nessa troca, o filtro por status deixou de ter controle próprio e virou apenas
coluna do quadro — defensável, já que o enunciado deixa a apresentação a
critério do candidato, mas a auditoria mostrou que um avaliador procurando o
controle poderia não creditar o requisito, e o seletor voltou. Depois, o Change
Request obrigou a mexer de novo na tela de detalhe, para acomodar o formulário
de comentário e trocar o histórico pela timeline.

O motivo é que a interface foi a única camada sem teste automatizado. Nas outras
eu tinha um sinal objetivo dizendo se algo quebrou; na interface, cada mudança
exigia reverificação manual completa. Retrabalho e ausência de teste andaram
juntos.

Houve retrabalho também na documentação, por um motivo diferente: parte dela
descrevia cobertura que não existia, e precisou ser corrigida depois da
auditoria.

---

## 10. Cite uma situação em que você rejeitou ou alterou uma abordagem sugerida pela IA.

A mais consequente foi manter as dependências do scaffold.

O caminho de menor esforço era seguir com `better-sqlite3` e Drizzle: já
estavam configurados, instalados e funcionando na minha máquina. Rejeitei
porque "funciona aqui" não é o critério do desafio — o requisito é reprodução a
partir do repositório, e um addon C++ quebra isso em qualquer máquina sem
binário pré-compilado para aquela combinação de plataforma e versão do Node.

Rejeitei também Vitest (o `node:test` já vem no runtime), `vue-router` (uma
página só), biblioteca de schema para validação (as regras são poucas e as
mensagens precisam nomear o campo em português) e deduplicação do seed por
título (trocada por `seed_key`, para não quebrar quando alguém criar um
incidente com o mesmo título de um registro de exemplo).

Um caso menor mas ilustrativo: na regressão do teste de persistência, a
sugestão foi remover a chamada duplicada de `stop()`. Alterei para tornar o
`stop()` idempotente — corrige a causa em vez do sintoma.

---

## 11. Qual parte da aplicação você considera menos confiável?

O front-end, sem dúvida, porque não tem um único teste automatizado.

Tudo que sei sobre o comportamento da interface veio de verificação manual.
Isso significa que uma regressão na tela não seria capturada por nada além de
alguém olhando. É a parte que mais mudou ao longo do dia — listagem, Kanban,
filtro de status, timeline — e, por coincidência nada acidental, a que mais deu
retrabalho.

Em segundo lugar, a atomicidade da transição de status. O `UPDATE` e o `INSERT`
do histórico rodam dentro de `BEGIN`/`COMMIT` com rollback, e acredito que
esteja correto, mas não há teste que injete falha no meio da transação para
provar. É uma garantia que eu afirmo por leitura de código, não por evidência.

---

## 12. Se tivesse mais duas horas, quais seriam suas três prioridades?

**1. Testes de front-end.** Vitest com Testing Library sobre os três
componentes, cobrindo o que hoje só existe como verificação manual: recusa de
transição exibindo mensagem no card, timeline renderizando os dois tipos de
evento na ordem certa, e recusa de comentário vazio. Ataca diretamente a parte
menos confiável.

**2. Teste de atomicidade da transição.** Injetar falha entre o `UPDATE` e o
`INSERT` para provar que o rollback deixa o incidente sem status novo e sem
histórico órfão. Hoje é a única garantia importante sustentada só por leitura
de código.

**3. Unificar o histórico exibido no card do Kanban com a timeline persistida.**
Hoje o card mostra apenas as transições feitas desde que a página carregou, e
essa informação se perde ao recarregar; a timeline completa vive na tela de
detalhe. São duas representações da mesma coisa, com durabilidades diferentes —
o tipo de divergência que confunde quem opera.

Nessa ordem: a primeira cobre o risco maior, a segunda transforma em evidência
uma garantia que hoje afirmo por leitura de código, e a terceira remove uma
inconsistência visível para o usuário.

---

## 13. Como você avalia sua estratégia inicial?

**O que manteria.**

Definir uma constituição antes de escrever código foi o que mais rendeu. Ela
transformou decisões que seriam de preferência em decisões com critério: o
princípio de portabilidade é o que reprovou o `better-sqlite3`, e sem ele eu
provavelmente teria seguido com o scaffold.

Manteria também o fatiamento vertical com spec antes de implementação, e
especialmente a decisão de isolar a regra de negócio em uma fatia própria,
antes da rota que a consome.

**O que mudaria.**

Perdi o checkpoint das 08:45. O commit tinha o `START.md`, mas não o `PLAN.md` —
eu estava usando o Spec Kit, que gera o próprio `plan.md` dentro de `specs/`, e
tratei aquilo como o plano exigido sem notar que o enunciado pedia um documento
consolidado na raiz. Teria lido a lista de entregáveis com mais atenção antes de
começar a codar, em vez de assumir que o formato da ferramenta atendia o formato
pedido.

Mudaria também a régua de "pronto". Até a fatia 006 eu media progresso por
funcionalidade entregue. Só na auditoria da tarde troquei para "existe teste que
falharia se isso quebrasse" — e foi essa troca que revelou um teste que passava
sem verificar nada e uma cobertura documentada que não existia. Se eu tivesse
adotado essa régua desde o início, os dois defeitos não teriam vivido o dia
inteiro.

E teria escrito ao menos um teste de front-end na primeira fatia de interface.
A ausência deles é a origem tanto da parte menos confiável quanto da maior
concentração de retrabalho.

---

## 14. Aproximadamente quantas interações relevantes com IA foram necessárias?

Entre 40 e 60 interações relevantes.

O `AI_LOG.md` documenta 12 delas em detalhe — as que mudaram o rumo do trabalho.
O restante foram iterações dentro dessas: ajustes de implementação, correções
de erro de compilação, refinamento de mensagens e verificações pontuais.

A distribuição foi desigual. As fatias 001 a 005 consumiram poucas interações
cada, porque as specs deixavam pouco espaço para interpretação. A auditoria da
tarde e o Change Request concentraram a maior parte.

---

## 15. Quais ferramentas de IA foram utilizadas?

Usei quatro ferramentas, cada uma em um tipo de tarefa distinto.

- **ZCode (GLM 5.3/Flash)** — constituição do projeto, specs, plano técnico e
  decomposição em tarefas. Toda a camada de planejamento do fluxo Spec Kit
  (`$speckit-constitution`, `$speckit-specify`, `$speckit-plan`,
  `$speckit-tasks`).
- **Kimi K3** — implementação das fatias 001 a 007: persistência, criação,
  regra de transição, histórico, filtros, dashboard e quadro Kanban.
- **Codex** — correção de bugs ao longo da implementação.


Não houve troca por falha de ferramenta: a divisão foi por tipo de tarefa. As
ferramentas de codificação ficaram com o código do produto; o planejamento
ficou concentrado em uma só, para manter coerência entre constituição, specs e
plano; e a auditoria foi feita por uma ferramenta que não havia participado da
implementação — de propósito, para que a revisão não herdasse as suposições de
quem escreveu o código.

Essa separação foi o que produziu os dois achados mais relevantes do dia: o
teste que passava sem verificar nada e a documentação que afirmava uma
cobertura de testes inexistente. Ambos passaram despercebidos por quem
implementou e só apareceram na revisão externa.
