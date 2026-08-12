# Infraestrutura e Configuração

Este documento descreve em detalhes a arquitetura Docker, Nginx e Keycloak da plataforma.

---

## Visão Geral da Arquitetura

```
                    ┌─────────────────────────────────────────┐
                    │              NGINX (porta 80)           │
                    │            API Gateway / Proxy          │
                    └─────────────────────────────────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           │                            │                            │
           ▼                            ▼                            ▼
    ┌─────────────┐             ┌─────────────┐             ┌─────────────┐
    │   / (raiz)  │             │  /api/*     │             │  /auth/*     │
    │   Next.js   │             │  Express    │             │  Keycloak   │
    │  (porta 3000)│             │  (porta 3001)│             │  (porta 8080)│
    └─────────────┘             └─────────────┘             └─────────────┘
           │                            │                            │
           └────────────────────────────┼────────────────────────────┘
                                       │
                              ┌────────┴────────┐
                              │   PostgreSQL   │
                              │  newone +      │
                              │  keycloak      │
                              └────────────────┘
                                       │
                              ┌────────┴────────┐
                              │    Mailpit     │
                              │  (emails SMTP) │
                              └────────────────┘
```

---

## Roteamento Nginx

| Path | Destino | Descrição |
|------|---------|-----------|
| `/` | Web (Next.js) | Aplicação frontend |
| `/callback` | Web | Página de callback OAuth (pós-login Keycloak) |
| `/api/*` | API (Express) | REST API da plataforma |
| `/auth/*` | Keycloak | Login, registro e SSO |
| `/health` | API | Health check |
| `/ready` | API | Readiness probe |

**Porta exposta:** apenas **80**. O Nginx centraliza todo o tráfego.

---

## Serviços Docker

### postgres

- **Imagem:** `postgres:15-alpine`
- **Banco principal:** `blinkfy` (aplicação)
- **Banco Keycloak:** `keycloak` (criado via `docker/postgres-init.sql`)
- **Credenciais:** `admin` / `password`
- **Porta:** 5432 (exposta para debug)

### mailpit

- **Imagem:** `axllent/mailpit:latest`
- **SMTP:** porta 1025 (sem autenticação)
- **Interface web:** porta 8025
- **Uso:** recebe todos os e-mails (verificação, Keycloak, etc.)

### keycloak

- **Imagem:** `quay.io/keycloak/keycloak:25`
- **Realm:** `recruitment` (importado automaticamente)
- **Admin console Keycloak:** `admin` / `admin`
- **Usuário de teste no realm:** `platform-admin` / `Admin123!`

### api

- **Build:** `apps/api/Dockerfile` (contexto raiz do monorepo)
- **Entrypoint:** aplica schema com `prisma db push` antes de subir
- **Porta interna:** 3001

### web

- **Build:** `apps/web/Dockerfile` (standalone Next.js)
- **Porta interna:** 3000

### nginx

- **Imagem:** `nginx:alpine`
- **Config:** `nginx/nginx.conf`
- **Porta:** 80

---

## Configuração Keycloak

### Realm `recruitment`

- **Self-registration:** habilitado
- **Verificação de e-mail:** habilitada
- **Roles:** `candidate`, `recruiter`, `company`, `admin`
- **Role padrão:** `candidate`

### Clientes OIDC

| Client ID | Tipo | Uso |
|-----------|------|-----|
| `recruitment-web` | public | SPA (login, registro, callback) |
| `recruitment-api` | confidential | API (service account, opcional) |

### URLs de Redirect (realm)

- `http://localhost/*`
- `http://127.0.0.1/*`

O callback da aplicação é `http://localhost/callback`.

### SMTP (Keycloak)

- **Host:** `mailpit`
- **Porta:** 1025
- **From:** `noreply@recruitment.local`

---

## Variáveis de Ambiente

### Docker Compose (stack completa)

| Variável | Serviço | Padrão | Descrição |
|----------|---------|--------|-----------|
| `JWT_SECRET` | api | `change-me-in-production-min-32-chars` | **Obrigatório em produção** (mín. 32 caracteres) |
| `FRONTEND_URL` | api | `http://localhost` | URL base do frontend (CORS, links em e-mail) |
| `CORS_ORIGIN` | api | `http://localhost` | Origens permitidas no CORS |
| `KEYCLOAK_ADMIN_PASSWORD` | keycloak | `admin` | Senha do admin do Keycloak |

### API (`apps/api`)

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | ✓ | `postgresql://admin:password@postgres:5432/blinkfy` |
| `JWT_SECRET` | ✓ (prod) | Mínimo 32 caracteres |
| `FRONTEND_URL` | ✓ | Ex.: `http://localhost` ou `https://app.exemplo.com` |
| `KEYCLOAK_URL` | (interno) | `http://keycloak:8080` (usado pelo API para trocar code) |
| `KEYCLOAK_REALM` | (interno) | `recruitment` |
| `KEYCLOAK_CLIENT_ID` | (interno) | `recruitment-web` |

### Web (`apps/web`)

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_API_URL` | URL da API. Ex.: `http://localhost/api` (com Nginx) ou `http://localhost:3001/api` (dev) |
| `NEXT_PUBLIC_KEYCLOAK_URL` | URL base do Keycloak. Ex.: `http://localhost/auth` (com Nginx) |
| `NEXT_PUBLIC_KEYCLOAK_REALM` | Nome do realm. Ex.: `recruitment` |
| `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID` | ID do cliente. Ex.: `recruitment-web` |

---

## Fluxo de Autenticação (Keycloak + API)

1. **Registro:** usuário clica em "Create account with SSO" → é enviado para Keycloak com `prompt=create`
2. **Keycloak:** formulário de registro, envio de e-mail de verificação
3. **Callback:** Keycloak redireciona para `http://localhost/callback?code=xxx&state=candidate`
4. **API:** frontend chama `POST /api/auth/keycloak-callback` com `code`, `redirectUri` e `userType`
5. **API:** troca `code` por token no Keycloak e cria/atualiza `User` no banco
6. **API:** retorna JWT da plataforma; frontend armazena e redireciona para o dashboard

**Compatibilidade:** o fluxo com e-mail/senha (`/api/auth/register`, `/api/auth/login`) segue funcionando em paralelo.

---

## Modos de Execução

### 1. Desenvolvimento local (sem Docker da app)

```bash
docker-compose up -d postgres mailpit
cd apps/api && npx prisma migrate dev && npx prisma db seed && cd ../..
npm run dev
```

- Web: http://localhost:3000  
- API: http://localhost:3001  
- `NEXT_PUBLIC_API_URL`: `http://localhost:3001/api`  
- Keycloak não é usado automaticamente; pode ser levantado separadamente se necessário

### 2. Stack completa (Docker, porta 80)

```bash
docker-compose up -d
```

- App: http://localhost  
- `NEXT_PUBLIC_API_URL`: `http://localhost/api`  
- Keycloak disponível em `http://localhost/auth`

### 3. Produção (apenas infra)

```bash
docker-compose up -d postgres mailpit keycloak
# API e Web em outro ambiente (Vercel, PM2, etc.)
```

---

## Arquivos de Configuração

| Arquivo | Descrição |
|---------|-----------|
| `docker-compose.yml` | Orquestração de todos os serviços |
| `nginx/nginx.conf` | Roteamento e proxy reverso |
| `keycloak/recruitment-realm.json` | Realm, clients, roles e usuário `platform-admin` |
| `docker/postgres-init.sql` | Criação do banco `keycloak` |
| `apps/api/docker-entrypoint.sh` | Execução de `prisma db push` antes do `node` |
| `apps/api/env-template` | Modelo de variáveis para a API |

---

## Checklist de Produção

- [ ] Alterar `KEYCLOAK_ADMIN_PASSWORD`
- [ ] Definir `JWT_SECRET` com pelo menos 32 caracteres
- [ ] Configurar `FRONTEND_URL` e `CORS_ORIGIN` com o domínio real
- [ ] Configurar SMTP de produção (substituir Mailpit)
- [ ] Adicionar redirect URIs do domínio em Keycloak (`https://app.exemplo.com/*`)
- [ ] Usar HTTPS (Nginx ou balanceador de carga)
- [ ] Revisar exposição de portas (ex.: PostgreSQL)
