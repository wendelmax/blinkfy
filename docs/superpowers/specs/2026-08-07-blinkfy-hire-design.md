# Blinkfy Hire — Design do MVP

## Status

Design aprovado para planejamento. **Blinkfy** é nome de trabalho e só deve ser usado externamente após validação jurídica e de domínio.

## Contexto e objetivo

Blinkfy é uma plataforma de Talent RevOps para agências especializadas de recrutamento. O primeiro produto, **Blinkfy Hire**, reduz o tempo entre uma vaga e uma shortlist qualificada, sem substituir a responsabilidade humana por decisões ou contatos autônomos de IA.

O piloto atende agências que recrutam perfis de vendas B2B e tecnologia. A promessa operacional é produzir uma shortlist explicável de até cinco candidatos em até 48 horas, com um fluxo auditável de requisitos, evidências, consentimento e avaliação humana.

## Proposta de marca e suíte

```text
Blinkfy
├── Blinkfy Hire        Talent RevOps, sourcing, ATS e shortlist
├── Blinkfy Talent      Carreira, oportunidades e preparação do candidato
├── Blinkfy Screen      Triagem por voz e dossiê de fit
└── Blinkfy Concierge   Assistente de IA com aprovação humana
```

Posicionamento de trabalho: **“The moment talent becomes opportunity.”**

O MVP é somente Blinkfy Hire. Blinkfy Screen entra como uma capacidade de qualificação dentro do Hire; Talent e Concierge completos são expansões posteriores.

## Restrições e princípios

1. O produto suporta agências, contratação direta e enterprise, mas o piloto é centrado em agências especializadas.
2. Candidato, recrutador e cliente têm papéis e dados isolados por workspace.
3. A IA prepara, classifica e explica; humanos aprovam interações externas e decisões de contratação.
4. Dados do candidato só são reutilizados entre clientes da mesma agência quando houver consentimento e finalidade registrada.
5. O produto não fará scraping, automação de mensagens, comentários, likes, evasão de bloqueios nem outra automação não autorizada em LinkedIn.
6. A integração com LinkedIn será `import-first` no MVP e parceria oficial de Talent Solutions em paralelo.
7. Triagem por voz será via navegador, mediante agendamento e consentimento explícito para gravação e processamento.

## Fluxo principal

```text
Vaga estruturada ou importada
  → importação de candidatos de fonte permitida
  → normalização, deduplicação e Fit Score
  → revisão humana do pipeline e de rascunhos
  → candidato aceita triagem de voz agendada
  → gravação, transcrição e dossiê
  → Top 5 para entrevista humana
```

### Entrada da vaga

Uma vaga pode ser criada de duas maneiras:

- formulário estruturado: cargo, competências, senioridade, localização, modalidade, salário, disponibilidade e pesos do score;
- importação de ATS, inicialmente por CSV e posteriormente por integração autenticada.

Os dois caminhos geram o mesmo objeto `Job` e o mesmo pipeline.

### Aquisição de candidatos

No MVP, um recrutador importa candidatos por CSV/ATS, candidatura direta ou exportação/seleção realizada em ferramentas autorizadas do LinkedIn. O sistema armazena fonte, data, base legal/consentimento, identidade de origem e qualidade de cada registro.

Em paralelo, Blinkfy solicita parceria LinkedIn Talent Solutions. Quando aprovado, o produto integra RSC/CRM Connect conforme os termos e a certificação exigidos.

## Modelo de dados e isolamento

```text
Agency Workspace
  ├── Members, roles, subscription, integrations and audit events
  └── Clients
       └── Jobs
            ├── Job scorecard and pipeline
            ├── Candidate applications
            ├── Review and activity events
            └── Screening sessions and dossiers

Candidate
  ├── Profile and permitted source data
  ├── Consent records and data-sharing purposes
  └── Candidate-to-job/application records
```

- Uma agência pode ter muitos clientes; um empregador direto usa o mesmo modelo com um único cliente.
- Dados e base de conhecimento de um cliente nunca são lidos por outro cliente.
- A reutilização de perfis pela mesma agência exige consentimento aplicável e evento de auditoria; o padrão é perfil privado.
- Gravações, transcrições e documentos possuem controle de acesso, retenção configurável e trilha de acesso.

## Fit Score explicável

Cada vaga define pesos revisáveis para a seguinte scorecard inicial:

| Fator | Peso inicial | Evidência |
|---|---:|---|
| Competências centrais | 35% | competências obrigatórias e experiências relacionadas |
| Experiência | 25% | senioridade, escopo e trajetória de cargo |
| Contexto | 15% | indústria, estágio de empresa e ambiente da função |
| Preferências | 15% | localização, modalidade, remuneração e disponibilidade |
| Sinais | 10% | interesse e confirmação de dados pelo candidato |

O resultado inclui nota, evidências, lacunas, confiança da informação e histórico de alterações. Características protegidas não entram no score. Baixa confiança gera revisão; o sistema não rejeita candidatos automaticamente. Sobrescritas humanas exigem justificativa.

## Agentes e guardrails

| Agente | Entrada | Saída | Limite |
|---|---|---|---|
| Intake | formulário ou importação de vaga | briefing e scorecard normalizados | não publica nem altera decisão |
| Fit | vaga e dados permitidos do candidato | ranking, evidências, gaps e confiança | não rejeita automaticamente |
| Outreach Copilot | perfil aprovado e contexto permitido | rascunho personalizado | não envia mensagens externamente |
| Screen | consentimento, agenda e roteiro | gravação, transcrição e avaliação | inicia apenas após consentimento explícito |
| Dossier | score, revisão e screening | resumo Top 5 e perguntas de deep dive | não altera resultado sem revisão |

O sistema pode processar, normalizar, pontuar e gerar rascunhos de forma assíncrona. Exigem aprovação humana ou consentimento: comunicação externa, convite de agenda, início/compartilhamento/retenção de gravação e qualquer decisão de contratação.

## Integrações

### MVP

- importação CSV para vagas e candidatos;
- webhooks de domínio para alteração de estágio, shortlist e conclusão de screening;
- calendário para agendamento de triagem de voz;
- armazenamento de gravações e transcrições com links protegidos.

### Pós-piloto

- primeiro conector ATS autenticado;
- RAG por cliente para benefícios, cultura e detalhes da vaga;
- n8n/MCP para workflows autorizados;
- LinkedIn Recruiter System Connect/CRM Connect, condicionados à aprovação como parceiro;
- CRM e analytics de receita/eficiência.

## Falhas e tratamento

- Importação inválida: mostrar erros por linha, permitir correção e reprocessamento idempotente.
- Dados duplicados: sinalizar possíveis correspondências, preservar origem e exigir resolução humana quando a confiança não for alta.
- IA indisponível ou sem evidência: manter o candidato no pipeline, marcar score pendente/baixa confiança e nunca inventar justificativas.
- Falha na gravação ou transcrição: informar participantes, preservar metadados de consentimento e permitir reagendamento; não promover candidato com dossiê incompleto automaticamente.
- Integração indisponível: registrar evento, aplicar retentativas seguras e disponibilizar exportação/manual fallback.
- Consentimento revogado: bloquear novos processamentos/compartilhamentos e executar política de retenção/exclusão aplicável.

## Verificação e qualidade

Cada entrega inclui testes unitários para regras de score, consentimento, isolamento e transições de pipeline; testes de integração para importação, filas, webhooks e storage; e testes de jornada para criação de vaga, importação, revisão, triagem e shortlist.

Os requisitos de aceite do piloto são:

1. A agência cria ou importa uma vaga sem suporte administrativo.
2. Pelo menos uma fonte permitida importa candidatos para o pipeline.
3. O recrutador entende o porquê de cada candidato no Top 5.
4. Consentimentos, aprovações e acessos a voz são auditáveis.
5. O tempo até shortlist reduz em relação à linha de base da agência.

## Roadmap recomendado

### Fase 0 — Fundação

Recuperar a capacidade de entrega do repositório: recriar o workspace web declarado, resolver builds, introduzir testes, migrations, tipos compartilhados, RBAC de workspace/cliente, eventos de auditoria, observabilidade e limites de armazenamento.

### Fase 1 — Blinkfy Hire Core

Entregar workspace multiagência/multicliente, criação/importação de vagas, CSV de candidatos, consentimento, deduplicação, score explicável, Kanban e shortlist.

### Fase 2 — Qualificação

Adicionar filas de aprovação, Outreach Copilot como rascunho, triagem web de voz, consentimento de gravação, transcrição, dossiê e agenda.

### Fase 3 — Conectividade

Entregar webhooks, primeiro conector ATS, RAG por cliente e calendário. Avançar RSC/CRM Connect apenas se a parceria LinkedIn for aprovada.

### Fase 4 — Expansão

Construir Blinkfy Talent, Blinkfy Concierge, perfil e preferências do candidato, billing, analytics e integrações adicionais.

## Fora do escopo do MVP

- envio autônomo, scraping ou mecanismos de evasão no LinkedIn;
- ligações telefônicas ou triagem por WhatsApp;
- motor completo de conteúdo/employer branding;
- billing complexo, modelos próprios e expansão multilíngue.
