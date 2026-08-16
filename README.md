# Blinkfy

Plataforma de Talent RevOps que conecta candidatos, recrutadores e empresas em um fluxo único de descoberta, qualificação e contratação.

O Blinkfy reúne quatro superfícies de produto: Blinkfy Hire (sourcing e pipeline), Blinkfy Talent (carreira do candidato), Blinkfy Screen (triagem consentida) e Blinkfy Concierge (operação assistida).

## Overview

Monorepo que concentra frontend, backend e pacotes compartilhados em um único repositório.

| App | Stack | Porta |
|-----|-------|------|
| **Web** (`apps/web`) | Next.js 16, React 19, Tailwind CSS | 3000 |
| **API** (`apps/api`) | Express 5, Prisma | 3001 |

## Tech Stack

- **Frontend:** Next.js, React 19, Tailwind CSS 4, TypeScript
- **Backend:** Node.js, Express 5
- **Database:** PostgreSQL + Prisma ORM
- **Shared:** `@recruitment-platform/shared` — tipos e constantes compartilhados
- **Workers:** [@wendelmax/tasklets](https://www.npmjs.com/package/@wendelmax/tasklets) — cálculos de impostos, análise GitHub
- **Infra:** Docker Compose, PM2

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20.9+
- [Docker](https://www.docker.com/) e Docker Compose

## Quick Start

### Opção A: Desenvolvimento local

```bash
npm install
docker-compose up -d postgres mailpit
cd apps/api && npx prisma migrate dev && npx prisma db seed && cd ../..
npm run dev
```

| Serviço  | URL                    |
|----------|------------------------|
| Web      | http://localhost:3000  |
| API      | http://localhost:3001  |
| Mailpit  | http://localhost:8025  |

### Opção B: Stack completa (Docker, porta 80)

Toda a infra com Nginx, Keycloak, API, Web e banco:

```bash
docker-compose up -d
```

| Serviço        | URL                         |
|----------------|-----------------------------|
| Aplicação      | http://localhost            |
| Mailpit        | http://localhost:8025        |
| Keycloak Admin | http://localhost/auth       |

**Credenciais padrão:**

- **Keycloak (console):** `admin` / `admin`
- **Realm recruitment (usuário de teste):** `platform-admin` / `Admin123!`

> 📖 **Configuração detalhada:** [docs/infrastructure-and-setup.md](docs/infrastructure-and-setup.md)

## Variáveis de Ambiente

### API (`apps/api`)

Copie `apps/api/env-template` para `apps/api/.env`:

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | ✓ | Connection string PostgreSQL |
| `JWT_SECRET` | ✓ | Mínimo 32 caracteres em produção |
| `FRONTEND_URL` | ✓ | URL do frontend (CORS, links em e-mails) |
| `PORT` | | Porta (padrão: 3001) |
| `SMTP_*` | | SMTP para envio de e-mails |
| `GITHUB_TOKEN` | | API GitHub (análise de repositórios) |

Para o piloto Blinkfy Hire, use um banco de teste separado. O teste da API
recusa URLs cujo nome não contenha `test`:

```bash
docker compose up -d postgres-test
export TEST_DATABASE_URL=postgresql://admin:password@localhost:5433/blinkfy_test
export DATABASE_URL="$TEST_DATABASE_URL"
```

As variáveis do navegador são `NEXT_PUBLIC_API_URL`,
`NEXT_PUBLIC_KEYCLOAK_URL`, `NEXT_PUBLIC_KEYCLOAK_REALM` e
`NEXT_PUBLIC_KEYCLOAK_CLIENT_ID`. Em produção, configure também
`FRONTEND_URL`, `CORS_ORIGIN` e um `JWT_SECRET` forte.

### Web (`apps/web`)

| Variável | Dev (sem Nginx) | Docker (porta 80) |
|----------|-----------------|-------------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | `http://localhost/api` |
| `NEXT_PUBLIC_KEYCLOAK_URL` | — | `http://localhost/auth` |
| `NEXT_PUBLIC_KEYCLOAK_REALM` | — | `recruitment` |
| `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID` | — | `recruitment-web` |

## Estrutura do Projeto

```
├── apps/
│   ├── api/          # Express REST API
│   │   ├── prisma/   # Schema e migrations
│   │   ├── src/
│   │   └── env-template
│   └── web/          # Next.js frontend
│       └── app/      # App Router
├── packages/shared/  # Tipos e constantes
├── nginx/            # API gateway
├── keycloak/         # Realm e usuários
├── docker/           # Init scripts
├── docs/
├── docker-compose.yml
└── package.json
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | API + Web em modo desenvolvimento |
| `npm run build` | Build de todos os workspaces |
| `npm run start` | Inicia apps em produção |
| `npm run lint` | Lint em todos os workspaces |

Scripts por workspace:

- **API:** `npm run dev --workspace=apps/api`, `npm run seed --workspace=apps/api`
- **Web:** `npm run dev --workspace=apps/web`

## Produção

### Docker Compose

```bash
# Infra (postgres + mailpit)
docker-compose up -d postgres mailpit

# Migrations e seed
cd apps/api && npx prisma migrate deploy && npx prisma db seed

# Subir API
docker-compose up -d api
```

O frontend pode ser hospedado em Vercel, Netlify ou servido via PM2.

### PM2

```bash
npm run build
pm2 start ecosystem.config.cjs
```

### Health Checks

| Endpoint | Uso |
|----------|-----|
| `GET /health` | Status da API e do banco |
| `GET /ready` | Readiness probe (Kubernetes, etc.) |

## Documentação

| Arquivo | Descrição |
|---------|-----------|
| [docs/infrastructure-and-setup.md](docs/infrastructure-and-setup.md) | **Infraestrutura** — Docker, Nginx, Keycloak, variáveis e fluxo de auth |
| [docs/README.md](docs/README.md) | Índice da documentação |
| [docs/recruitment-system-full-spec.md](docs/recruitment-system-full-spec.md) | Especificação do fluxo de recrutamento |
| [docs/journeys-and-interactions.md](docs/journeys-and-interactions.md) | Jornadas de usuários |
| [docs/blinkfy-hire-pilot.md](docs/blinkfy-hire-pilot.md) | Runbook do piloto Blinkfy Hire |
| [docs/blinkfy-product-overview.md](docs/blinkfy-product-overview.md) | Visão de produto e posicionamento Blinkfy |

## Revenue Sharing Ledger

O ledger de compartilhamento de receita registra evidência contábil interna e
auditável para uma colocação do marketplace. Ele não inicia checkout, escrow,
payout, saque ou transferência de fundos; nenhum endpoint aceita credenciais
de pagamento. Os modelos legados `Placement` e `WalletTransaction` e
`apps/api/src/services/paymentService.js` permanecem fora desse fluxo e não
foram alterados.

Todos os endpoints abaixo exigem um membro do workspace com acesso ao cliente:

| Endpoint | Owner / admin | Recruiter |
|----------|---------------|-----------|
| `POST /api/blinkfy/clients/:clientId/revenue-sharing/preview` | Pode calcular preview | Somente a própria placement |
| `POST /api/blinkfy/clients/:clientId/revenue-sharing/allocations` | Pode confirmar | Somente a própria placement |
| `GET /api/blinkfy/clients/:clientId/revenue-sharing/ledger` | Vê o ledger do cliente | Vê apenas as próprias allocations |
| `POST /api/blinkfy/clients/:clientId/revenue-sharing/allocations/:allocationId/reverse` | Pode reverter | Não autorizado |

Valores são unidades menores inteiras e moedas são códigos ISO 4217 em
maiúsculas. O split padrão é 70% para o recruiter (`7000` basis points) e 30%
para Blinkfy (`3000`). Para uma receita bruta `grossAmountMinor`, o valor do
recruiter é `floor(grossAmountMinor * recruiterBasisPoints / 10000)`; qualquer
resíduo de arredondamento fica com Blinkfy. Allocations iniciam em `pending`.
O modelo completo é `pending -> available -> reversed`, mas esta entrega só
cria `pending` e permite a reversão compensatória para `reversed`; a promoção
para `available` depende da futura política aprovada de escrow/retenção.

## Contribuindo

Contribuições são bem-vindas. Abra uma issue ou PR.
# Blinkfy Talent pilot

The repository now includes the candidate-controlled Blinkfy Talent workspace alongside Blinkfy Hire. Candidate access is free at launch; recruiter/company sourcing and workflow capabilities are the paid operating surface. See [the pilot guide](docs/blinkfy-talent-pilot.md) for consent semantics, guardrails and the Premium Engagement draft-only boundary.
