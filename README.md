# Incident Hub

Aplicação web para registrar e acompanhar incidentes operacionais: criação
validada, quadro por status com transição inline, regra de negócio que impede
incidentes `Critical` de irem direto de `Open` para `Resolved`, comentários por
incidente, timeline cronológica única reunindo comentários e mudanças de status,
e dashboard com contadores em tempo real. Tudo persistido em SQLite, sem
dependência de compilação nativa.

## Pré-requisitos

- **Node.js 24 ou superior** — obrigatório. A persistência usa `node:sqlite`,
  módulo estável a partir do Node 24. Versões anteriores não sobem a API.
- **npm** (acompanha o Node).
- **Docker e Docker Compose** — opcional, apenas para o caminho em containers.

Não há dependência de compilação nativa: nenhum módulo exige `node-gyp`,
Python ou toolchain C++. Um clone limpo sobe apenas com `npm install`.

## Instalação

```bash
npm install
```

O projeto é um monorepo npm workspaces — este comando instala as dependências
da API e da web de uma vez, a partir da raiz.

## Execução

```bash
npm run dev
```

Sobe API e front simultaneamente:

| Serviço | Endereço |
|---------|----------|
| Web | http://localhost:5173 |
| API | http://localhost:3000 |

O front consome a API pelo caminho relativo `/api`, resolvido pelo proxy do
Vite em desenvolvimento. Não é preciso configurar CORS nem variáveis de
ambiente.

Para subir os serviços separadamente: `npm run dev:api` e `npm run dev:web`.

### Execução com Docker

```bash
docker compose up --build
```

| Serviço | Endereço |
|---------|----------|
| Web | http://localhost:8080 |
| API | http://localhost:3000 |

Aqui o nginx faz o `proxy_pass` de `/api` para a API, e o banco fica em um
volume nomeado (`sqlite-data`), sobrevivendo a `docker compose down`.

## Dados iniciais

**Os dados de exemplo são criados automaticamente.** A API executa o seed no
boot, então basta subir a aplicação — não há passo manual.

São gravados três incidentes:

| Título | Severidade | Responsável | Status |
|--------|-----------|-------------|--------|
| Payment API instability | Critical | Ana | Open |
| Reconciliation delay | High | Bruno | In Progress |
| Incorrect customer notification | Medium | Carla | Resolved |

O seed é **idempotente**: cada registro tem uma `seed_key` única, então
reiniciar a aplicação quantas vezes for não duplica nada, e incidentes que
você criar não são afetados. Os três nascem com o status indicado e **sem**
registro de histórico — histórico só existe para transições reais.

Para executá-lo manualmente:

```bash
npm run seed
```

### Resetar os dados

O banco é um arquivo único, criado em `apps/api/data/incident-hub.db`. Para
começar do zero, apague-o e suba a aplicação de novo — o seed roda no boot e
recria os três incidentes:

```bash
rm -rf apps/api/data/
npm run dev
```

No Docker, o equivalente é remover o volume:

```bash
docker compose down -v
```

## Testes

```bash
npm test
```

Executa a suíte completa (`node:test` via `tsx`), organizada em três níveis,
escolhidos pelo que cada um consegue provar:

- **Domínio puro** — a matriz completa de transições: 4 severidades × 3 status
  de origem × 3 de destino, 36 combinações, incluindo a restrição `Critical`.
  Mais a validação de entrada de incidentes e de comentários. Sem banco, sem
  rede, sem framework.
- **Integração** — servidor real contra banco SQLite em arquivo temporário:
  criação e validação de entrada, recusa de transição **sem efeitos colaterais**,
  histórico somente-adição, filtros combinados, contadores do dashboard,
  comentários (recusas que não gravam nada, ausência de efeito sobre o
  incidente) e ordenação determinística da timeline.
- **Reinício de processo** — o servidor é encerrado e um novo sobe apontando
  para o mesmo arquivo SQLite, exigindo incidentes, histórico, comentários e a
  ordem da timeline intactos. Reimportar o módulo de banco no mesmo processo não
  provaria isso: o cache de módulos do ESM mascararia o defeito.

Os testes de integração sobem o servidor como **subprocesso real** — não há mock
de persistência. A cobertura por requisito está mapeada em
[ACCEPTANCE.md](ACCEPTANCE.md).

## Arquitetura

Monorepo npm workspaces com dois aplicativos.

```text
apps/api/                        Fastify + TypeScript
├── src/
│   ├── domain/
│   │   ├── status-rules.ts      Regra de transição — função pura, sem I/O
│   │   └── constants.ts         Enums canônicos de status e severidade
│   ├── db/sqlite.ts             Conexão node:sqlite, DDL, PRAGMAs
│   ├── http/
│   │   ├── validation.ts        Validação de entrada
│   │   └── errors.ts            Contrato de erro único { error }
│   ├── routes/incidents.ts      Endpoints REST
│   ├── seed.ts                  Dados iniciais idempotentes
│   └── server.ts                Bootstrap: db → seed → rotas → listen
└── test/                        Domínio, integração e reinício

apps/web/                        Vue 3 + Vite
└── src/
    ├── api.ts                   Cliente HTTP tipado — único ponto de contato
    └── components/
        ├── KanbanBoard.vue      Quadro por status, dashboard, transição inline
        ├── IncidentForm.vue     Criação
        └── IncidentDetail.vue   Detalhe, timeline unificada e comentários
```

### Decisões que moldam a estrutura

**A regra de transição vive em um único arquivo, como função pura.**
`domain/status-rules.ts` não conhece banco, HTTP nem framework. Rotas e UI
apenas a consomem. Isso garante que a restrição `Critical` não possa ser
contornada por um caminho alternativo, e permite testá-la exaustivamente sem
subir nada.

**A UI nunca reescreve o texto da regra.** Ela exibe verbatim a mensagem vinda
do campo `error` da API. Duplicar a regra no front-end criaria duas fontes de
verdade que divergiriam em silêncio.

**Status e histórico são gravados na mesma transação SQL.** Nunca existe um
status novo sem o registro de histórico correspondente; um crash no meio deixa
tudo ou nada.

**Os enums são garantidos pelo banco**, via `CHECK` constraint — não apenas
pela aplicação. Mesmo uma escrita fora do caminho normal não consegue gravar um
status inválido.

**A timeline é derivada em leitura, não persistida.** Comentários e alterações
de status vivem em suas próprias tabelas; a timeline unificada é a fusão
ordenada das duas no momento da consulta. Uma tabela de eventos duplicaria
dados já gravados e criaria uma terceira fonte capaz de divergir. O desempate é
`(instante, tipo, id)`, para que a ordem seja determinística.

**Comentar não altera o incidente.** Registrar um comentário não move o
`updatedAt` nem gera entrada no histórico de status: comentário é atividade
*sobre* o incidente, não alteração *do* incidente.

**Persistência sem dependência nativa.** SQLite através de `node:sqlite`
(biblioteca padrão do Node 24), com SQL direto. O scaffold inicial trazia
`better-sqlite3` + Drizzle; os três foram removidos porque um addon C++ colocaria
em risco a reprodutibilidade em uma máquina sem binário pré-compilado, e um ORM
com migrations não se justifica para duas tabelas.

### API

| Método | Rota | Função |
|--------|------|--------|
| `GET` | `/incidents` | Lista, com filtros `status` e `severity` combináveis |
| `POST` | `/incidents` | Cria — sempre em `Open`, timestamps pelo servidor |
| `GET` | `/incidents/:id` | Detalhe com histórico, comentários e timeline |
| `POST` | `/incidents/:id/status` | Altera status; `422` se a regra recusar |
| `POST` | `/incidents/:id/comments` | Registra comentário; `400` se autor ou conteúdo vazio |
| `GET` | `/dashboard` | Contadores do estado atual |
| `GET` | `/health` | Verificação de saúde |

### Variáveis de ambiente

Todas têm default funcional — a aplicação sobe sem configurar nada.

| Variável | Default |
|----------|---------|
| `PORT` | `3000` |
| `SQLITE_PATH` | `data/incident-hub.db`, relativo ao diretório da API — em desenvolvimento resulta em `apps/api/data/incident-hub.db`; no container, `/app/data/incident-hub.db` |

## Limitações conhecidas

- **O histórico exibido no card do Kanban é apenas da sessão atual.** Ele
  mostra as transições feitas desde que a página foi carregada e se perde ao
  recarregar. O histórico completo e persistido está sempre na tela de detalhe
  do incidente, que é a fonte de verdade.

- **Não há testes automatizados de front-end.** Todos os critérios de interface
  são verificáveis apenas manualmente. A cobertura por requisito está mapeada
  em [ACCEPTANCE.md](ACCEPTANCE.md).

- **Não há edição nem exclusão de incidentes.** Apenas criação, leitura e
  mudança de status. Foi decisão de escopo: edição livre enfraqueceria a
  auditabilidade do histórico.

- **Sem autenticação e sem controle de concorrência.** O enunciado dispensa
  autenticação, e o ambiente é único e compartilhado. Duas pessoas alterando o
  mesmo incidente ao mesmo tempo têm o comportamento de "último a escrever
  vence" — não há bloqueio otimista.

- **Sem paginação, busca textual ou ordenação configurável.** A lista devolve
  todos os incidentes ordenados por data de criação decrescente. Adequado ao
  volume esperado; não escalaria para milhares de registros.
