# Recruitment Platform

Plataforma de recrutamento e seleção de desenvolvedores para empresas do exterior. Conecta talentos globais a oportunidades internacionais, com suporte a compliance, pagamentos e avaliação técnica automatizada.

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

- [Node.js](https://nodejs.org/) 18+
- [Docker](https://www.docker.com/) e Docker Compose

## Quick Start

```bash
# 1. Instalar dependências (monorepo com workspaces)
npm install

# 2. Subir PostgreSQL e Mailpit
docker-compose up -d postgres mailpit

# 3. Configurar banco e seed
cd apps/api && npx prisma migrate dev && npx prisma db seed && cd ../..

# 4. Rodar API e Web
npm run dev
```

- **Web:** http://localhost:3000  
- **API:** http://localhost:3001  
- **Mailpit (emails):** http://localhost:8025

## Variáveis de Ambiente

### API (`apps/api`)

Copie `apps/api/env-template` para `apps/api/.env`:

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | ✓ | Connection string PostgreSQL |
| `JWT_SECRET` | ✓ | Mínimo 32 caracteres em produção |
| `FRONTEND_URL` | ✓ | URL do frontend (CORS, emails) |
| `PORT` | | Porta (padrão: 3001) |
| `SMTP_*` | | SMTP para envio de emails |
| `GITHUB_TOKEN` | | API GitHub (análise de repositórios) |

### Web (`apps/web`)

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_API_URL` | URL da API (padrão: `http://localhost:3001/api`) |

## Estrutura do Projeto

```
├── apps/
│   ├── api/          # Express REST API
│   │   ├── prisma/   # Schema e migrations
│   │   ├── src/
│   │   └── env-template
│   └── web/          # Next.js frontend
│       └── app/      # App Router
├── packages/
│   └── shared/       # Tipos, constantes e API_ROUTES
├── docs/             # Documentação
├── docker-compose.yml
├── ecosystem.config.cjs  # PM2
└── package.json      # Workspaces
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

- [`docs/README.md`](docs/README.md) — Índice da documentação
- [`docs/recruitment-system-full-spec.md`](docs/recruitment-system-full-spec.md) — Especificação do fluxo de recrutamento
- [`docs/journeys-and-interactions.md`](docs/journeys-and-interactions.md) — Jornadas de usuários

## Contribuindo

Contribuições são bem-vindas. Abra uma issue ou PR.
