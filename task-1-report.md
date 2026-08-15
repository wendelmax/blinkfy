# Task 1 — Deterministic Revenue Split Domain

## Implementação

- Adicionado `calculateRevenueSplit` em `apps/api/src/services/blinkfy/revenueSplitService.js`.
- Adicionados testes unitários em `apps/api/test/blinkfy/revenueSplitService.test.js`.
- A moeda é normalizada para maiúsculas e validada como código de três letras.
- O valor bruto deve ser inteiro seguro positivo; os basis points devem ser inteiros entre 0 e 10000 e totalizar 10000.
- O cálculo usa truncamento inteiro para o recrutador e atribui o residual à plataforma.
- O resultado começa sempre com `confirmed: false` e `transferred: false`.

## Verificação TDD

- RED: `npm run test --workspace=apps/api -- revenueSplitService.test.js` falhou porque o módulo ainda não existia (`Cannot find module .../revenueSplitService`).
- GREEN: o mesmo comando passou com **1 arquivo e 16 testes**.
- `git diff --check`: passou.

## Verificação ampla

`npm run test --workspace=apps/api` terminou com 53 arquivos/128 testes passando e 15 suites falhando antes da execução por dependências pré-existentes do workspace: Prisma Client gerado ausente (`Cannot find module '.prisma/client/default'`) e pacote compartilhado sem `dist/index.js`. A suite focada da Task 1 permanece verde.

## Preocupações

Nenhuma preocupação funcional na Task 1. A execução completa requer gerar o Prisma Client e o build do pacote shared, fora do escopo desta task.
