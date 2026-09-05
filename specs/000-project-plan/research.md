# Research: Incident Hub — Decisões Técnicas

Data: 2026-09-05 · Cobertura: todas as 5 fatias (plano conjunto).

## R1 — Persistência: substituir `better-sqlite3` por `node:sqlite`

- **Decision**: Usar `node:sqlite` (`DatabaseSync`, biblioteca padrão do
  Node 24) com SQL direto. Remover `better-sqlite3`, `drizzle-orm`,
  `drizzle-kit`, `@types/better-sqlite3`.
- **Rationale**: A constituição proíbe módulo que exija compilação nativa e
  manda preferir biblioteca padrão. `better-sqlite3` é um addon C++ (quando não
  há binário pré-compilado para a plataforma/versão, compila via node-gyp — o
  scaffold até lista `allowScripts` para ele, sinal do problema). O Node 24
  embute SQLite estável sem flag. Com 2 tabelas e DDL simples, um ORM não
  justifica 2 dependências + toolchain de migrations; `CREATE TABLE IF NOT
  EXISTS` na inicialização cobre o requisito de "subir em clone limpo" sem
  passo manual.
- **Alternatives considered**: (a) Manter better-sqlite3 — rejeitado (módulo
  nativo, viola Princípio VII); (b) libsql — rejeitado (dependência extra sem
  ganho local); (c) JSON em arquivo — rejeitado (concorrência de escrita frágil
  e integridade do append-only dependente de código próprio).

## R2 — Enum de status: nomes canônicos

- **Decision**: Valores canônicos em inglês exatamente como nas specs —
  `Open`, `In Progress`, `Resolved` para status; `Low`, `Medium`,
  `High`, `Critical` para severidade — armazenados e trocados na API nessa forma.
- **Rationale**: As specs (001–005) definem esses literais e os testes de aceite
  os citam (ex.: "Critical não resolvido em Open e em In Progress"). O scaffold
  usava `open/investigating/resolved` — divergência corrigida antes de estender
  (Princípio I). Constantes compartilhadas evitam strings soltas.
- **Alternatives considered**: lowercase no banco + mapeamento na borda —
  rejeitado (duas representações = uma fonte de bug silencioso; Princípio VI).

## R3 — Runner de testes: `node:test` via `tsx`

- **Decision**: `node:test` (padrão) com execução `tsx --test`, suíte única
  `npm test` na raiz (workspaces).
- **Rationale**: Zero dependência nova (constituição VII); cobertura exigida
  (matriz, contadores, reinício, campos obrigatórios) é de comportamento, não
  de framework de teste. `tsx` já está no scaffold como devDependency do dev.
- **Alternatives considered**: Vitest/Jest — rejeitados (dependência nova sem
  necessidade; diff de configuração maior).

## R4 — CORS: remover `@fastify/cors`

- **Decision**: Remover o plugin; front consome a API por caminho relativo
  `/api` (proxy do Vite em dev; nginx `proxy_pass` em produção container).
- **Rationale**: Same-origin nos dois modos; o plugin existia no scaffold sem
  necessidade — dependência sem justificativa viola VII.
- **Alternatives considered**: CORS aberto em dev — rejeitado (dependência +
  superfície desnecessária; o proxy já resolve).

## R5 — Seed: idempotência por chave de negócio

- **Decision**: `INSERT` com verificação por `title` único do seed
  (`INSERT ... ON CONFLICT DO NOTHING` com UNIQUE parcial em `title` dos
  incidentes de seed, ou SELECT-antes-de-INSERT dentro de transação); status
  gravado direto, sem `status_changes`.
- **Rationale**: Spec 001 exige: rodar duas vezes não duplica; grava direto na
  persistência com o status indicado; sem histórico. UNIQUE parcial evita
  colisão com incidentes de usuário de mesmo título... na verdade, o seed usa
  marcação própria: coluna `seed_key` (UNIQUE) preenchida só nos registros de
  seed — mais robusto que depender de `title`.
- **Alternatives considered**: deduplicar por title — rejeitado (um usuário
  poderia legitimamente criar um incidente com o mesmo título e o seed
  passaria a não gravar; a `seed_key` isola a idempotência).

## R6 — Timestamps

- **Decision**: Armazenar como INTEGER (epoch ms) e converter para ISO 8601
  UTC na borda HTTP; `createdAt = updatedAt` na criação; `updatedAt =
  changedAt = agora` na mesma transição.
- **Rationale**: Comparações e ordem cronológica do histórico triviais em SQL;
  ISO 8601 na API é inequívoco. "Agora" vem do relógio do processo — a regra
  pura (003) continua sem relógio.
- **Alternatives considered**: ISO TEXT no banco — viável, mas ordenação
  cronológica do histórico fica dependente de formato; INTEGER é mais simples.

## R7 — Unidade de trabalho da transição aceita

- **Decision**: UPDATE de incident (status, updated_at) + INSERT em
  status_changes dentro de **uma transição SQL** (`BEGIN`/`COMMIT`).
- **Rationale**: Spec 004 exige indivisibilidade observável: nunca status novo
  sem seu registro de histórico. SQLite garante atomicidade da transação;
  reinício no meio deixa tudo ou nada.
- **Alternatives considered**: duas operações independentes — rejeitado
  (janela de inconsistência entre status e histórico).

## R8 — Validação de entrada e formato de erro

- **Decision**: Validação manual (sem schema-validator) em `http/validation.ts`
  — campo a campo, coletando todos os problemas; resposta de erro única:
  `{ "error": string }` com mensagem em português nomeando o campo;
  status HTTP 400 (inválido), 404 (não encontrado), 409/422 (transição
  recusada).
- **Rationale**: Regras de validação são pequenas e especificadas nas specs;
  uma lib de schema (typebox/ajv/zod) seria dependência nova sem ganho
  proporcional (VII). Mensagens nomeando o campo são requisito direto das
  specs 002/005.
- **Alternatives considered**: JSON Schema via Fastify — rejeitado (adiciona
  dependências; mensagens precisariam tradução custom de qualquer forma).

## R9 — Front-end: componentes Vue mínimos, cliente HTTP único

- **Decision**: Vue 3 + Vite mantidos; 4 componentes (Lista, Formulário,
  Detalhe, Dashboard) sem router — detalhe abre por estado/seleção na mesma
  página; `src/api.ts` centraliza fetch tipado; mensagens de erro exibidas
  verbatim do campo `error` da API.
- **Rationale**: Escopo pequeno; router/map-state seriam dependências extras
  sem necessidade (VII). Exibir verbatim garante "mensagem compreensível" sem
  duplicar texto da regra (Princípio III: não reescrever a regra na UI).
- **Alternatives considered**: SPA com vue-router — rejeitado nesta fase (uma
  página, zero navegação real; pode ser emendado com registro no PLAN.md se o
  detalhe exigir URL própria).

## R10 — Reinício de processo nos testes

- **Decision**: Testes de integração iniciam o servidor como subprocesso
  (`node dist/server.js` ou via tsx) apontando `SQLITE_PATH` para arquivo
  temporário, matam o processo e o reiniciam no mesmo arquivo, verificando os
  dados — sem mock de persistência.
- **Rationale**: Specs 001/002/004 exigem sobrevivência ao reinício do
  **processo**, não do módulo; subprocesso é a única prova honesta.
- **Alternatives considered**: reimportar módulo de db — rejeitado (cache de
  módulo em ESM mascararia bugs; teste não provava o requisito).
