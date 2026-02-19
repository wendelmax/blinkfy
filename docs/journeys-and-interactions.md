# Jornadas e Interações — Sistema de Recrutamento (Versão Lançamento)

Este documento descreve **todas** as jornadas e interações que cada ator tem com o sistema, sem mocks: fluxos reais, APIs e persistência.

---

## 1. Atores

| Ator | Descrição | Tipo no sistema |
|------|-----------|-----------------|
| **Candidato** | Desenvolvedor que busca vagas no exterior | `userType: candidate` |
| **Recrutador** | Agência ou headhunter que faz sourcing | `userType: recruiter` |
| **Empresa** | Contratante que publica vagas e contrata | `userType: company` |
| **Admin** | (Futuro) Gestão da plataforma | `userType: admin` |

---

## 2. Jornada: Candidato

### 2.1 Cadastro (Onboarding)

1. **Entrada:** `/onboarding` → "I'm a Developer" → `/onboarding/candidate`
2. **Step 1 – Identidade e sync**
   - Campos: Full name, Email, Password, GitHub username, LinkedIn URL
   - Dados mantidos em estado local até o fim do fluxo
3. **Step 2 – Expertise**
   - Primary tech stack, Years of experience, English level, Monthly rate (USD)
4. **Step 3 – Tax**
   - Tax residence, Tax ID (CPF/CNPJ), City & State
5. **Step 4 – Conclusão**
   - Botão "Go to Dashboard" → **POST /api/auth/register** com:
     - `email`, `password`, `fullName`, `userType: "candidate"`
     - `githubUsername`, `linkedinUrl`, `primaryStack`, `experienceLevel`, `englishLevel`, `salaryExpectationUsd`, `taxResidence`, `taxId`, `cityState`
   - Resposta: `token` + `user` → `localStorage.setItem("auth_token", token)` e redirect para `/dashboard`

**Persistência:** `User` + `CandidateProfile` (Prisma). E-mail de verificação enviado via SMTP (Mailpit em dev).

### 2.2 Login

1. **Entrada:** `/login`
2. Campos: Email, Password
3. **POST /api/auth/login** → `token` + `user`
4. `localStorage` guarda token; redirect para `/dashboard` (candidato) ou `/dashboard/recruiter` (recruiter/company)

### 2.3 Dashboard (Candidato)

1. **GET /api/auth/me** (no layout) → nome e tipo; se 401 → redirect `/login`
2. **GET /api/dashboard/metrics** → `readiness`, `matches`, `eScore`, `applications`, `currencyRate` (todos do DB)
3. **Audit (E-Score):** botão "New Audit" → modal com GitHub username e Salary demand → **POST /api/candidate/sync-profile** → atualiza `CandidateProfile.eScore` e `readinessScore`; resposta exibe E-Score e recomendação

### 2.4 Vagas

1. **Página:** `/dashboard/jobs`
2. **GET /api/job/list** (público) → lista de vagas abertas (DB)
3. Filtro local por título, stack, empresa
4. "View Details" → modal; "Apply Now" → **POST /api/job/apply** com `jobId` (auth) → cria `Application`; toast de sucesso

### 2.5 Wallet

1. **Página:** `/dashboard/wallet`
2. **GET /api/payment/wallet-summary** (opcional: `?salaryUsd=`) → `wallet` (balance, available, pendingEscrow), `projections` (câmbio, grossBrl, irrf, netBrl), `transactions` (lista do DB)
3. Câmbio: API Frankfurter ou `EXCHANGE_RATE` (env); impostos Brasil via `taxService.calculateBrazilTaxes`
4. "Withdraw Funds" → modal; submit apenas registra intenção (sem gateway real no MVP)

### 2.6 Perfil e Configurações

- **Perfil:** `/dashboard/profile` — formulário com dados do candidato (hoje estático; pode ser ligado a **PATCH /api/candidate/profile** no futuro)
- **Configurações:** `/dashboard/settings` — tela de configurações (sem endpoints específicos no MVP)

---

## 3. Jornada: Recrutador / Empresa

### 3.1 Cadastro (Onboarding)

1. **Entrada:** `/onboarding` → "I'm a Recruiter" ou "I'm a Company" → `/onboarding/recruiter?type=agency|company`
2. **Step 1 – Organização**
   - Full name, Email, Password, Company/Agency name, Website, Size
3. **Step 2 – Necessidades**
   - Primary roles, Hiring volume
4. **Step 3 – Conclusão**
   - "Enter Dashboard" → **POST /api/auth/register** com:
     - `fullName`, `email`, `password`, `userType: "recruiter"|"company"`, `companyType: "agency"|"company"`
     - `companyName`, `website`, `size`, `roleTypes`, `hiringVolume`
   - Resposta: token → localStorage e redirect `/dashboard`

**Persistência:** `User` + `Company` (Prisma).

### 3.2 Dashboard (Recrutador/Empresa)

1. **GET /api/auth/me** + **GET /api/dashboard/metrics** + **GET /api/dashboard/recruiter-tools**
2. Métricas: `openJobs`, `activeCandidates`, `commissions`, `pendingEscrow` (do DB e `Placement`)
3. Recruiter tools: `campaigns` (jobs da empresa), `topCandidates` (perfis com E-Score; do DB)
4. "Post New Job" → link para `/dashboard/jobs?create=1`

### 3.3 Vagas (Recrutador/Empresa)

1. **Página:** `/dashboard/jobs`
2. Se `?create=1` e user é recruiter/company: exibe formulário "Post a new job"
3. **POST /api/job/create** (auth): `title`, `description`, `location`, `jobType`, `salaryMinUsd`, `salaryMaxUsd`, `stack[]` → cria `Job` (companyId do usuário)
4. Lista de vagas: mesma **GET /api/job/list** (vagas abertas de todas as empresas)

### 3.4 Pipeline e Empresa

- **Pipeline:** `/dashboard/pipeline` — Talent Pool (pode consumir lista de candidatos/Applications no futuro)
- **Company:** `/dashboard/company` — dados da empresa (pode consumir **GET /api/company** no futuro)

### 3.5 Ganhos (Recrutador)

1. **Página:** `/dashboard/recruiter/earnings` (ou via dashboard overview)
2. **GET /api/payment/recruiter-earnings** → `totalEarned`, `pendingRetention`, `nextPayout`, `transactions` (a partir de `Placement` no DB)

---

## 4. APIs Resumidas

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | /api/auth/register | Não | Registro candidato/recruiter/company |
| POST | /api/auth/login | Não | Login → token + user |
| GET | /api/auth/me | Sim | Usuário atual + profile/company |
| POST | /api/auth/verify-email | Não | Verificação por token |
| GET | /api/dashboard/metrics | Sim | Métricas por tipo de usuário (DB) |
| GET | /api/dashboard/recruiter-tools | Sim | Campanhas e top candidatos (DB) |
| POST | /api/candidate/sync-profile | Sim | GitHub + E-Score; atualiza perfil |
| POST | /api/candidate/interview-assessment | Sim | Avaliação de fala (determinística) + perguntas |
| GET | /api/payment/wallet-summary | Sim | Wallet + projeções + transações (DB) |
| GET | /api/payment/recruiter-earnings | Sim | Ganhos a partir de Placements (DB) |
| GET | /api/job/list | Não | Lista de vagas abertas |
| POST | /api/job/create | Sim | Criar vaga (recruiter/company) |
| POST | /api/job/apply | Sim | Candidatar-se (candidato) |
| GET | /api/metadata/tech-stacks | Não | Lista de tech stacks (DB) |

---

## 5. Infra e Serviços Reais

- **DB:** PostgreSQL (Prisma); migração com `npx prisma migrate dev` (após subir o Postgres).
- **Auth:** JWT (env `JWT_SECRET`), bcrypt para senha, sessão via token no header.
- **E-mail:** Nodemailer; SMTP em dev com Mailpit (porta 1025; UI 8025). Variáveis: `SMTP_HOST`, `SMTP_PORT`, `FRONTEND_URL` (para link de verificação).
- **Câmbio:** Frankfurter API ou `EXCHANGE_RATE` (env); log em `ExchangeRateLog`.
- **GitHub:** **GET** reais à API do GitHub (opcional `GITHUB_TOKEN` para rate limit); análise de repos e E-Score persistido em `CandidateProfile`.
- **Impostos (Brasil):** `taxService.calculateBrazilTaxes` (faixas IRRF); sem mock.

---

## 6. Como rodar para lançamento

1. **Variáveis de ambiente (API):** `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `SMTP_HOST` (ex.: localhost), `SMTP_PORT` (1025 para Mailpit), opcional `EXCHANGE_RATE`, opcional `GITHUB_TOKEN`.
2. **Containers (ex.: Podman/Docker):**
   - Postgres: `docker-compose up -d postgres`
   - Mailpit: `docker-compose up -d mailpit`
3. **Migração e seed:** `cd apps/api && npx prisma migrate dev && npx prisma db seed`
4. **API:** `npm run dev --workspace=apps/api`
5. **Web:** `npm run dev --workspace=apps/web`

Nenhum mock ou placeholder permanece nos fluxos acima: cadastro, login, dashboard, vagas, wallet, ganhos e métricas usam dados reais e APIs implementadas.
