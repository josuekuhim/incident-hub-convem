# PLAN.md — Incident Hub

> **Sobre este documento**
>
> O planejamento deste projeto foi conduzido pelo fluxo Spec Kit, que produz
> seus próprios artefatos de planejamento: a constituição do projeto
> (`.specify/memory/constitution.md`), o plano técnico conjunto
> (`specs/000-project-plan/plan.md`), as decisões técnicas com alternativas
> rejeitadas (`specs/000-project-plan/research.md`), o modelo de dados
> (`data-model.md`) e o contrato da API (`contracts/api.md`).
>
> Tomei esses artefatos como o plano do projeto e não me atentei a que o
> enunciado pedia um `PLAN.md` consolidado na raiz do repositório — por isso
> ele não integrou o commit do checkpoint. Este documento reúne aquele material
> no formato solicitado. As decisões descritas aqui são as que efetivamente
> guiaram a implementação, registradas naqueles arquivos no momento em que
> foram tomadas.

---

## Entendimento

Uma equipe pequena de operações acompanha incidentes por mensagens informais.
O custo disso não é a falta de registro — é a falta de **estado confiável**:
ninguém consegue responder com segurança quantos incidentes estão abertos,
quais são graves e ainda não foram tratados, quem é responsável por cada um, e
o que já foi feito.

O problema, portanto, não é "criar um CRUD de incidentes". É garantir que o
estado de cada incidente seja **verdadeiro, auditável e não contornável**:

- o status precisa ter transições governadas por regra, não por convenção;
- cada mudança precisa deixar rastro permanente, associado ao incidente;
- os números do resumo precisam refletir os dados atuais, sempre;
- nada disso pode se perder ao reiniciar a aplicação.

A regra de negócio central — um incidente `Critical` não pode ir direto de
`Open` para `Resolved` — é o coração do desafio. Ela existe para impedir que
algo grave seja fechado sem passar por tratamento reconhecido. Tratá-la como
uma validação de formulário seria errar o ponto: ela é invariante de domínio e
precisa valer independentemente de qual caminho da aplicação tentou a
mudança.

## Escopo

### Obrigatório

- Modelo `Incident` com identificador, título, descrição, severidade,
  responsável, status, data/hora de criação e de última atualização.
- Criação com quatro campos obrigatórios (título, descrição, severidade,
  responsável); `status = Open`, `id` e timestamps definidos **pelo servidor**,
  ignorando o que o cliente enviar nesses campos.
- Visualização dos incidentes com título, severidade, responsável e status.
- Filtro por status e por severidade, combináveis.
- Tela de detalhe com os sete campos exigidos.
- Alteração de status com a restrição `Critical: Open ↛ Resolved`, recusada
  com feedback compreensível.
- Histórico de mudanças de status persistido, com status anterior, novo status
  e data/hora, associado ao incidente.
- Dashboard com incidentes abertos, `Critical` não resolvidos e resolvidos.
- Persistência sobrevivente a reload da página e a reinício do processo.
- Dados iniciais com os três incidentes especificados, disponíveis sem cadastro
  manual.
- Testes automatizados das regras críticas.
- README que permita a outra pessoa executar a solução do zero.

### Desejável

- Execução via Docker Compose, para eliminar dependência do ambiente local.
- Visualização em quadro Kanban, com transição inline sem recarregar a página.
- Feedback de recusa exibido no próprio card que originou a tentativa.
- Destaque visual por severidade.
- Seed idempotente, executado automaticamente no boot da API.

### Fora de escopo

- Autenticação, autorização e múltiplos perfis — o enunciado dispensa
  explicitamente, e o ambiente é único e compartilhado.
- Organizações ou multi-tenancy.
- Edição e exclusão de incidentes — o enunciado pede criação, leitura e
  mudança de status; edição livre enfraqueceria a auditabilidade do histórico.
- Busca textual, paginação e ordenação configurável — volume esperado é baixo.
- Comentários, anexos, notificações e SLA.
- Deploy público.

A régua para "fora de escopo": o enunciado (seção 22) é explícito em que
funcionalidade extra não compensa requisito obrigatório mal feito. Cada item
acima foi recusado para preservar tempo de teste e documentação dos
obrigatórios.

## Decisões técnicas

### Stack

**Node.js 24 + TypeScript 5.9**, monorepo com npm workspaces
(`apps/api` + `apps/web`).

- **API: Fastify.** Reduz código de protocolo e serialização sem impor
  arquitetura. O ganho é concreto e o custo é uma dependência.
- **Web: Vue 3 + Vite.** UI reativa com build rápido e sem configuração.
  Sem `vue-router`: a aplicação é uma página só, e navegação real não existe —
  o detalhe abre por estado local.

### Persistência

**SQLite através de `node:sqlite`** (`DatabaseSync`), com SQL direto.

Esta foi a decisão mais consequente do projeto. O scaffold inicial trazia
`better-sqlite3` + `drizzle-orm` + `drizzle-kit`, e todos os três foram
removidos:

- `better-sqlite3` é um addon nativo C++. Sem binário pré-compilado para a
  plataforma e versão do avaliador, exige toolchain de compilação via
  `node-gyp`. Isso coloca em risco o requisito mais básico do enunciado —
  que a solução seja reproduzível a partir do repositório.
- `node:sqlite` é biblioteca padrão do Node 24, estável e sem flag. Zero
  instalação, zero compilação.
- Um ORM com toolchain de migrations não se justifica para duas tabelas cujo
  DDL cabe em `CREATE TABLE IF NOT EXISTS` na inicialização.

Esquema em duas tabelas: `incidents` e `status_changes`. Os enums são
garantidos por `CHECK` constraint no próprio banco, não apenas na aplicação —
mesmo uma escrita fora do caminho normal não consegue gravar status inválido.
Timestamps armazenados como epoch em `INTEGER` e convertidos para ISO 8601 na
borda HTTP, o que torna a ordenação cronológica do histórico trivial em SQL.
Caminho configurável por `SQLITE_PATH`, com default funcional.

### Estrutura geral

```text
apps/api/src/
├── domain/status-rules.ts   # regra de transição: função pura, único lugar
├── domain/constants.ts      # enums canônicos
├── db/sqlite.ts             # conexão, DDL, PRAGMAs
├── http/validation.ts       # validação de entrada
├── http/errors.ts           # contrato de erro único { error }
├── routes/incidents.ts      # endpoints REST
├── seed.ts                  # dados iniciais idempotentes
└── server.ts                # bootstrap: db → seed → rotas → listen

apps/web/src/
├── api.ts                   # cliente HTTP tipado, único ponto de contato
└── components/              # KanbanBoard, IncidentForm, IncidentDetail
```

O princípio estruturante: **a regra de transição vive em um arquivo, é uma
função pura e não conhece banco, HTTP nem framework**. Rotas e UI apenas a
consomem. Isso garante que a restrição `Critical` não possa ser contornada por
um caminho alternativo, e que ela seja testável sem subir nada.

Consequência deliberada: a UI **nunca reescreve o texto da regra**. Ela exibe
verbatim a mensagem vinda do campo `error` da API. Duplicar a regra no
front-end criaria duas fontes de verdade que divergem silenciosamente.

Escrita de status e histórico acontecem na **mesma transação SQL**
(`BEGIN`/`COMMIT`). Nunca deve existir um status novo sem o registro de
histórico correspondente; um crash no meio deixa tudo ou nada.

### Estratégia de testes

`node:test` (runner padrão), executado via `tsx --test`. Sem Vitest ou Jest:
a cobertura necessária é de comportamento, não de framework, e a dependência
extra não se pagaria.

Três níveis, escolhidos pelo que cada um consegue provar:

1. **Domínio puro** — a matriz completa 4 severidades × 3 status de origem ×
   3 de destino, 36 combinações. Sem I/O, sem banco, sem rede. É a prova de que
   a regra está correta em si mesma.
2. **Integração** — servidor real subindo contra banco SQLite em arquivo
   temporário: criação, validação, recusa de transição sem efeitos colaterais,
   append-only do histórico, filtros, dashboard.
3. **Reinício de processo** — o servidor é iniciado como subprocesso, morto e
   reiniciado apontando para o mesmo arquivo, verificando que os dados
   permanecem. Reimportar o módulo de banco não provaria nada: o cache de
   módulo do ESM mascararia o bug. Subprocesso é a única prova honesta de
   persistência.

## Decomposição

Trabalho fatiado em incrementos verticais, cada um com spec própria em
`specs/` e terminando com a suíte inteira verde.

| Fatia | Entrega |
|-------|---------|
| **000** | Plano técnico conjunto, decisões, modelo de dados, contrato da API |
| **001** | Remediação do scaffold (`node:sqlite`, enums canônicos), persistência, seed idempotente, listagem, estado vazio |
| **002** | Criação com quatro campos obrigatórios, valores de sistema protegidos, erros nomeando o campo inválido |
| **003** | `status-rules.ts` — função pura + matriz de 36 casos. Nada mais muda nesta fatia |
| **004** | Transição via rota consumindo a 003, histórico append-only em transação única, tela de detalhe, 404 específico |
| **005** | Filtros combináveis por status e severidade, dashboard com os três contadores |
| **006** | Quadro Kanban com transição inline e atualização sem reload |

A ordem não é arbitrária: a regra pura (003) vem **antes** da rota que a usa
(004), para que a rota nasça consumindo uma regra já provada, em vez de
embutir lógica que depois precisaria ser extraída.

## Critérios de aceite

Cada requisito é considerado concluído quando existe **teste automatizado** que
o demonstra, não quando a tela parece funcionar.

| Requisito | Como determino que está pronto |
|-----------|-------------------------------|
| Criação | POST sem cada um dos quatro campos obrigatórios é rejeitado nomeando o campo; severidade fora do enum é rejeitada; `id`/`status`/timestamps enviados pelo cliente são ignorados; incidente nasce `Open` |
| Regra `Critical` | As 36 combinações da matriz passam; `Critical` + `Open` → `Resolved` retorna 422 **sem alterar o incidente e sem gravar histórico**; `Open → In Progress → Resolved` é aceito |
| Histórico | Uma transição aceita grava exatamente um registro; registros são apenas inseridos, nunca alterados; a ordem cronológica é estável; sobrevive a reinício |
| Filtros | Status e severidade combinam como interseção; valor inválido retorna erro explícito em vez de lista vazia silenciosa |
| Dashboard | Sequência 1/1/1 → 0/1/1 → 0/0/2 conforme as transições ocorrem; `Critical` não resolvido conta tanto em `Open` quanto em `In Progress` |
| Persistência | Servidor morto e reiniciado no mesmo arquivo mantém incidentes e histórico |
| Dados iniciais | Seed executado duas vezes não duplica; grava os três incidentes com os status indicados; não gera histórico |
| Reprodutibilidade | Clone limpo sobe seguindo **apenas** o README, sem passo manual e sem toolchain de compilação |

## Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **Tempo insuficiente para documentação** — o código costuma consumir a janela inteira e os entregáveis (`README`, `AI_LOG`, `FINAL_REPORT`) ficam para o fim | Alto — o enunciado avalia documentação explicitamente | `AI_LOG` escrito incrementalmente, no momento em que cada fatia acontece, não reconstruído no fim |
| **Dependência nativa quebrando em clone limpo** | Alto — inviabiliza a avaliação | Eliminada na raiz: `node:sqlite`, zero módulo nativo |
| **Regra de negócio duplicada entre API e UI** | Alto — divergência silenciosa é o pior tipo de bug | Função pura única; UI exibe a mensagem da API verbatim |
| **Scaffold inicial divergente das specs** (usava `investigating`, criação sem `owner`) | Médio — bug silencioso se estendido sem corrigir | Corrigir antes de estender; enums canônicos com `CHECK` no banco |
| **Escopo inflado por funcionalidade extra** | Médio — extras não compensam obrigatórios quebrados | Lista de fora de escopo definida antes de codar |
| **Ambiente do avaliador diferente do meu** | Médio | Docker Compose como caminho alternativo; toda variável com default funcional |
| **Regressão ao evoluir a UI entre fatias** | Médio | Suíte completa verde como condição de commit |

## Estratégia de IA

Uso a IA como **executora sob especificação**, não como decisora de arquitetura.
O fluxo adotado é o Spec Kit, e a disciplina é a mesma em cada fatia:

1. **Especificar antes de gerar.** Cada fatia começa por uma spec em `specs/`
   com critérios de aceite testáveis. Sem isso, a IA preenche as lacunas com
   suposições plausíveis e erradas.
2. **Fatias pequenas.** Uma tarefa por vez, diff pequeno, suíte verde antes de
   seguir. Diffs grandes gerados de uma vez são caros de revisar e escondem
   regressões.
3. **Verificação independente do que a IA afirma.** "Implementado" e "testado"
   não são a mesma coisa. Critério de conclusão é `npm test` verde e validação
   ponta a ponta, não a descrição que o modelo dá do próprio trabalho.
4. **Decisões técnicas revisadas por mim.** As alternativas rejeitadas em
   `research.md` (better-sqlite3, ORM, Vitest, `vue-router`, JSON Schema, dedupe
   de seed por título) foram avaliadas e recusadas por critério explícito —
   principalmente portabilidade e custo de dependência.
5. **Registro contemporâneo.** `AI_LOG.md` escrito no momento em que a interação
   acontece, incluindo o que precisou ser abandonado ou corrigido.

O ponto de atenção que carrego durante todo o desafio: modelos são
particularmente propensos a produzir código que *parece* correto para a regra
`Critical`, tratando-a como uma validação de formulário em vez de invariante de
domínio. Por isso a fatia 003 existe isolada e vem antes da rota que a consome.
