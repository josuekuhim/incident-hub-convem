<!--
=== SYNC IMPACT REPORT ===
Version change: (nenhuma — scaffold não ratificado) → 1.0.0
Modified principles: (nenhum — ratificação inicial; scaffold substituído)
Added sections:
  - Core Principles I–VIII (Correção Primeiro; Escopo Fechado; Máquina de Estados
    Pura e Centralizada; Persistência e Histórico Somente-Adição; Testes
    Automatizados Obrigatórios; Falhas Explícitas; Portabilidade e Dependências
    Justificadas; Rastreabilidade e Emendas)
  - Restrições de Escopo e Tecnologia
  - Fluxo de Trabalho e Qualidade
  - Governance
Removed sections: (nenhum)
Follow-up TODOs: (nenhum)
=== END SYNC IMPACT REPORT ===
-->

# Constitution do Incident Hub

## Core Principles

### I. Correção Primeiro

A ordem de prioridade para qualquer decisão de projeto é: **correção →
completude → simplicidade → confiabilidade → extras**. Correção sempre vence:
nenhum recurso novo, otimização ou melhoria estética justifica quebrar um
comportamento já correto. "Extras" só entram depois que tudo anterior está
satisfeito, e devem ser justificados explicitamente.

### II. Escopo Fechado

Os seguintes temas estão **permanentemente fora de escopo** e NÃO devem ser
implementados, planejados ou aceitos em tasks: autenticação, permissões,
multi-tenant, edição e exclusão de incidente, busca textual, paginação e deploy
público. Propostas que os introduzam — mesmo parcialmente — devem ser
rejeitadas em revisão, independentemente do mérito técnico.

### III. Máquina de Estados Pura e Centralizada

Toda lógica de transição de status vive em **uma única função pura**: sem I/O,
sem acesso a banco, sem dependência de framework. A máquina de estados deve ser
alterável em **um único arquivo**, sem tocar em rotas, UI ou persistência.

Regra do Critical (NON-NEGOTIABLE): a transição `Open → Resolved` é proibida
**exclusivamente para incidentes Critical**. Incidentes Low, Medium e High
transitam livremente entre quaisquer status. Tentativas de `Open → Resolved`
em incidentes Critical são rejeitadas com mensagem compreensível.

### IV. Persistência e Histórico Somente-Adição

Os dados sobrevivem ao **reinício do processo**, não apenas ao refresh da
página. O histórico de status é persistido junto ao incidente, é **somente
adição** (append-only) e nunca é reescrito ou removido. Toda alteração de
status atualiza a data/hora de última atualização do incidente e gera
**exatamente um** registro de histórico — nem zero, nem mais de um.

### V. Testes Automatizados Obrigatórios (NON-NEGOTIABLE)

A suíte automatizada cobre, no mínimo:

- Transição válida e inválida, **para cada severidade**;
- Contadores do dashboard, incluindo Critical não resolvido contabilizado em
  Open **e** em In Progress;
- Persistência após reinício do processo;
- Rejeição de campos obrigatórios ausentes na criação.

**Nenhum commit com teste vermelho.** Se um teste falha, o commit não existe.

### VI. Falhas Explícitas

Operação inválida nunca falha em silêncio nem retorna sucesso. Entrada inválida
e transição proibida produzem mensagem **compreensível para o usuário final**,
não stack trace. Campos obrigatórios na criação: **título, descrição,
severidade, responsável**. Todo incidente nasce com status **Open** e data/hora
de criação automática; o cliente não envia esses valores.

### VII. Portabilidade e Dependências Justificadas

A aplicação deve subir em um **clone limpo, em outra máquina**, seguindo apenas
o README. Toda dependência nova exige **justificativa explícita**; prefira a
biblioteca padrão. Proibido: módulo que exija compilação nativa; passo manual
não documentado; variável de ambiente sem valor padrão funcional.

### VIII. Rastreabilidade e Emendas

Interações relevantes são registradas no `AI_LOG.md` **no momento em que
acontecem**. Toda emenda desta constituição ou do plano exige: registro no
`PLAN.md`, motivo da mudança, e verificação de que os testes existentes
continuam válidos.

## Restrições de Escopo e Tecnologia

- A ordem de prioridade da Princípio I aplica-se a escolhas de tecnologia:
  ferramentas mais simples e corretas vencem ferramentas completas e frágeis.
- Persistência deve ser local e portável (sobreviver ao reinício do processo é
  requisito da Princípio IV); nenhuma infraestrutura externa obrigatória.
- Nenhum recurso dos temas fora de escopo (Princípio II) pode ser adicionado
  "de brinde" por uma dependência escolhida por outro motivo.
- O README é o único caminho de bootstrap documentado: qualquer comando,
  variável ou passo necessário para subir a aplicação deve estar nele.

## Fluxo de Trabalho e Qualidade

- **Uma task por vez.** O diff de cada task deve ser pequeno o suficiente para
  ser lido por inteiro antes do commit.
- **Antes de cada commit**: rodar a suíte completa e confirmar que o que já
  funcionava continua funcionando (sem regressão).
- **Ao quebrar algo**: reverter para o último commit bom em vez de empilhar
  correções sobre um estado desconhecido.
- Código morto, comentado ou "preparado para o futuro" não entra: completude é
  da spec, não do palpite.

## Governance

- Esta constituição prevalece sobre todas as outras práticas, specs e planos
  do projeto. Conflitos se resolvem em favor deste documento.
- Emendas exigem: (1) registro no `PLAN.md` com o motivo da mudança, (2)
  incremento de versão conforme semântica abaixo, (3) verificação de que os
  testes existentes continuam válidos — ajustados apenas se a emenda os torna
  obsoletos, nunca silenciosamente removidos.
- Versionamento: MAJOR para remoção ou redefinição incompatível de princípio;
  MINOR para novo princípio ou expansão material de orientação; PATCH para
  esclarecimentos e ajustes de redação sem mudança semântica.
- Toda revisão de PR/task verifica conformidade com os princípios acima;
  complexidade e dependências novas devem ser justificadas no próprio diff.

**Version**: 1.0.0 | **Ratified**: 2026-09-05 | **Last Amended**: 2026-09-05
