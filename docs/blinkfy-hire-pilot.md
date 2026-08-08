# Blinkfy Hire Core — piloto

Este runbook valida o primeiro produto Blinkfy: uma camada de Talent RevOps
para agências e recrutadores que importam candidatos de fontes permitidas,
registram consentimento, compartilham candidatos com um cliente e conduzem uma
shortlist revisada por uma pessoa.

## Escopo do piloto

O fluxo aceito é:

`vaga → importação CSV/ATS → consentimento client_presentation → compartilhamento → Fit Score explicável → revisão humana → shortlist`

O Fit Score é uma recomendação com evidências e lacunas; ele não rejeita
automaticamente candidatos e não usa idade, gênero, raça, nacionalidade,
deficiência, religião, gravidez ou outras características protegidas. Toda
rejeição exige motivo de uma pessoa. Candidatos ficam privados no workspace e
só podem ser apresentados a um cliente com consentimento ativo e auditável.

O Core não faz scraping do LinkedIn, login automatizado, rotação de IP,
convites, mensagens, curtidas, comentários ou qualquer outreach automático. Uma
integração futura deve usar apenas APIs/parceiros oficiais, autorização do
cliente e revisão humana antes de qualquer comunicação externa.

## Subir o ambiente isolado

Pré-requisitos: Node.js 20.9+, Docker e Docker Compose.

```bash
npm install
docker compose up -d postgres-test
export TEST_DATABASE_URL=postgresql://admin:password@localhost:5433/blinkfy_test
export DATABASE_URL="$TEST_DATABASE_URL"
export JWT_SECRET=local-pilot-secret-change-me
export FRONTEND_URL=http://localhost:3000
export CORS_ORIGIN=http://localhost:3000
export NEXT_PUBLIC_API_URL=http://localhost:3001/api
export NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
export NEXT_PUBLIC_KEYCLOAK_REALM=recruitment
export NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=recruitment-web
```

O serviço `postgres-test` usa o banco `blinkfy_test` na porta `5433`. Não
execute a suíte contra `newone`, que é o banco de desenvolvimento.

```bash
cd apps/api
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
cd ../..
```

## Seed e walkthrough de aceitação

O teste E2E é o seed reproduzível do piloto: ele cria uma agência (workspace),
um cliente, um membro recrutador e uma vaga isolada. Em seguida importa o CSV
de exemplo abaixo, tenta compartilhar sem consentimento (deve retornar `409`),
registra a evidência de consentimento e só então cria a aplicação.

```csv
fullName,email,linkedinUrl,currentTitle,location,skills,source
Ana Sales,ana@example.test,https://www.linkedin.com/in/ana-sales,Account Executive,Brazil,enterprise sales|SaaS,referral
```

Execute o fluxo completo:

```bash
TEST_DATABASE_URL="$TEST_DATABASE_URL" npm run test --workspace=apps/api -- hireCore.e2e.test.js
```

O teste verifica a sequência `mapped → reviewed → interested → screened →
shortlisted`, o score com fatores explicáveis, os detalhes do candidato no
pipeline e os eventos de auditoria de importação, consentimento,
compartilhamento, score e mudança de estágio.

Para subir a API e a interface durante uma validação manual:

```bash
export DATABASE_URL="$TEST_DATABASE_URL"
npm run dev --workspace=apps/api
# em outro terminal
NEXT_PUBLIC_API_URL=http://localhost:3001/api npm run dev --workspace=apps/web
```

## Analytics operacional

A camada de analytics é consultiva: mede o funil do cliente e evidencia
gargalos, mas nunca rejeita candidatos nem muda estágios automaticamente.

- **UI:** `/hire/analytics`, acessível pelo link "Pipeline analytics" na
  workspace do Hire. Filtros de vaga (`jobId`) e intervalo de datas
  (`from`/`to`) são opcionais; sem filtro, o escopo é todo o histórico do
  cliente ativo.
- **API:** `GET /api/blinkfy/clients/:clientId/analytics`, protegida pelo
  mesmo middleware de workspace do Hire Core. `jobId`, quando informado,
  precisa pertencer ao `clientId` do escopo; o endpoint retorna `404` para
  cliente ou vaga inacessível, em vez de vazar a existência do recurso.
- **Semântica das datas:** UTC, intervalo inclusivo no início e exclusivo no
  fim (`from <= evento < to`). Datas malformadas ou um intervalo invertido
  (`from >= to`) retornam `400`.
- **Conversão sem amostra:** quando o estágio de origem não tem nenhuma
  aplicação (`byStage[origem] === 0`), a conversão correspondente é `null`,
  exibida como "No sample" — não `0%`. Tratar os dois casos como
  equivalentes esconde a diferença entre "sem candidatos" e "conversão
  zerada".
- **Duração incompleta:** o tempo médio por estágio usa apenas transições
  com evento de saída auditado. Uma aplicação parada em um estágio sem
  transição registrada não entra na média (`sampleSize` reflete só as
  transições completas), evitando subestimar o tempo real.
- **Regra de uso:** os números do dashboard apoiam a decisão humana do
  recrutador; nenhuma métrica de analytics rejeita um candidato, muda um
  estágio ou dispara ação automática. A decisão final continua sendo de uma
  pessoa, com motivo registrado.

Executar o teste de aceitação com o passo de analytics incluído:

```bash
TEST_DATABASE_URL="$TEST_DATABASE_URL" npm run test --workspace=apps/api -- hireCore.e2e.test.js
```

Após a shortlist, o teste chama o endpoint de analytics do cliente do piloto
e confirma o total de aplicações, a contagem em `shortlisted`, o
consentimento ativo e a contagem de scores. Em seguida cria um segundo
cliente no mesmo workspace e confirma que o analytics dele não inclui a
aplicação do primeiro cliente.

## Operação segura

- Registre a origem de cada candidato (`source`) e preserve o histórico de
  importações. Reimports idempotentes devem resultar em duplicatas vinculadas
  à importação, sem criar uma segunda identidade.
- Antes de compartilhar, confirme que existe consentimento ativo para
  `client_presentation` e para o cliente correto. Revogação bloqueia novos
  compartilhamentos.
- Não altere um score sem guardar justificativa e identidade do revisor.
- Use a lista como apoio à decisão; o recrutador é responsável por revisar
  evidências, lacunas e a decisão final.
- Não inclua dados sensíveis ou atributos protegidos no scorecard. Trate
  currículo, e-mail e links de perfil como dados pessoais: limite acesso,
  retenha apenas o necessário e remova dados conforme a política do cliente.
- Em qualquer falha de importação, preserve o registro de erro e não tente
  repetir disparos externos automaticamente.

## Verificação completa

```bash
npm run test --workspace=apps/api
npm run test --workspace=apps/web
npm run build
docker compose config
git diff --check
```

## Roadmap pós-Core (explicitamente adiado)

1. **Integrações ATS e LinkedIn oficiais:** conectores por parceiro/API
   aprovada, escopos mínimos, consentimento e revisão humana; nunca scraping.
2. **Blinkfy Talent:** perfil do candidato, descoberta de oportunidades,
   consentimento próprio, assinatura/monetização opcional e controles de
   privacidade.
3. **Inbox e outreach assistido:** rascunhos contextualizados, kill-switch,
   aprovação humana e trilha de auditoria; nenhuma mensagem automática no
   Core.
4. **Voice Screener:** chamada somente após opt-in explícito, aviso de
   gravação, transcrição, retenção configurável e revisão de vieses.
5. **RAG corporativo:** documentos por cliente, isolamento vetorial,
   respostas fundamentadas e encaminhamento humano para dúvidas sem fonte.
6. **Calendário, webhooks e MCP/n8n:** agendamento com confirmação,
   idempotência, permissões revogáveis e logs de integração.
7. **Billing e RevOps:** planos para agências, métricas de funil, receita do
   produto candidato e exportação auditável.

Cada item acima exige uma especificação própria, threat model, critérios de
aceitação e uma revisão de privacidade antes de entrar em produção.
