# Fluxos do Usuário (User Flows)

Este documento ilustra as jornadas principais dentro da plataforma utilizando diagramas Mermaid.

## 1. Onboarding e Auditoria do Candidato

Este fluxo mostra como a IA intervém desde o momento do cadastro para garantir a qualidade do pool de talentos.

```mermaid
sequenceDiagram
    participant C as Candidato
    participant P as Plataforma (IA)
    participant G as GitHub/LinkedIn
    
    C->>P: Realiza Cadastro
    C->>P: Conecta GitHub e LinkedIn
    P->>G: Solicita Dados via API/Scraping
    G-->>P: Retorna Histórico e Código
    P->>P: Analisa Stacks, Qualidade e Comunicação
    P-->>C: Exibe Relatório de "Readiness" e Badges
    alt Score < 70
        P-->>C: Sugere Cursos e Melhorias
    else Score >= 70
        P-->>P: Libera para Visualização de Empresas
    end
```

## 2. Ciclo de Recrutamento Automatizado

Como a empresa interage com a plataforma para encontrar o candidato ideal.

```mermaid
graph LR
    A[Empresa publica Vaga] --> B[IA Sugere Filtros Customizados]
    B --> C[Busca Ativa no Banco Auditado]
    C --> D[Top Matches Identificados]
    D --> E[Entrevista Assíncrona via IA Interviewer]
    E --> F[Shortlist Gerada com Insights de IA]
    F --> G[Entrevista Final Humana]
    G --> H[Contratação e Setup de Pagamento]
```

## 3. Fluxo de Pagamento e Milestone

Nuance de segurança financeira para projetos ou contratos de longo prazo.

```mermaid
stateDiagram-v2
    [*] --> ContratoAssinado
    ContratoAssinado --> DepósitoEscrow: Empresa transfere fundos
    DepósitoEscrow --> TrabalhoEmAndamento: Candidato inicia
    TrabalhoEmAndamento --> EntregaRealizada: Milestone atingido
    EntregaRealizada --> RevisãoEmpresa
    RevisãoEmpresa --> PagamentoLiberado: Aprovação
    PagamentoLiberado --> SaqueCandidato: Conversão de Moeda
## 4. Fluxo de Faturamento e Conciliação Fiscal (Bridge)

Como o sistema conecta o pagamento internacional com a obrigação fiscal local.

```mermaid
graph TD
    A[Empresa Paga em USD via Stripe] --> B[Plataforma Gera Invoice Internacional]
    B --> C[Gateway de Câmbio Processa Conversão PTAX]
    C --> D[Valor em BRL cai na Conta do Desenvolvedor]
    D --> E[Sistema detecta Recebimento via Webhook]
    E --> F[IA gera Nota Fiscal de Exportação via API Prefeitura]
    F --> G[Candidato e Empresa recebem comprovantes conciliados]
```

## 5. Ciclo de Amparo Contínuo (Pós-Contratação)

Acompanhamento do desenvolvedor para garantir retenção e saúde fiscal.

```mermaid
graph TD
    A[Início do Contrato] --> B[Abertura/Migração de Empresa PJ via Parceiro]
    B --> C[Recebimento Mensal via Plataforma]
    C --> D[Câmbio e Autofill de Nota Fiscal]
    D --> E[Cálculo de Imposto e Pró-Labore (IA)]
    E --> F[Dashboard de Saúde Financeira]
    F --> G{Novo Milestone ou Ano?}
    G -- Sim --> H[Revisão de Carreira e Mentoria IA]
    H --> C
```
## 6. Fluxo de Autenticação Segura (IAM & Biometria)

Como o sistema lida com tokens e verificação facial.

```mermaid
sequenceDiagram
    participant U as Usuário
    participant A as IAM System
    participant M as SMS/Email Gateway
    participant B as Biometric API (AWS/Azure)
    
    U->>A: Solicita Login/Ação Crítica
    A->>M: Envia Token (OTP)
    M-->>U: Token recebido no Mobile/Email
    U->>A: Insere Token
    A->>U: Solicita Reconhecimento Facial
    U->>B: Captura Imagem (Liveness)
    B->>B: Compara com Documento (KYC)
    B-->>A: Match Confirmado
    A-->>U: Acesso Liberado (JWT de Alta Confiança)
```

## 7. Fluxo de Retenção e Compliance Fiscal

Como o sistema gere a retenção de impostos e o repasse líquido.

```mermaid
graph TD
    A[Empresa Paga Valor Bruto] --> B{Smart Wallet (Retenção)}
    B -- Taxa Plataforma --> C[Receita Plataforma]
    B -- Provisão de Impostos --> D[Cálculo de Guia IR/DARF]
    D --> E[Pagamento Automático do Imposto via API]
    B -- Valor Líquido --> F[Conversão Câmbio]
    F --> G[Depósito Conta Candidato]
    G --> H[IA gera Declaração Anual de Renda]
```

## 8. Fluxo de Mobilidade Global e Visto

Jornada do desenvolvedor que deseja relocar para o exterior.

```mermaid
graph LR
    A[Candidato Remoto (High Performance)] --> B[Empresa solicita Relocação]
    B --> C[IA analisa Elegibilidade de Visto]
    C --> D[Geração Automática de Documentos e Contrato]
    D --> E[Submissão ao Consulado/Imigração]
    E --> F[Aprovação e Onboarding Presencial]
    F --> G[Gestão de Equity (Vesting) Inicia]
```

## 9. Fluxo de Leilão de Competência (Ranking de Eficiência)

Como a IA equilibra o custo-benefício para o recrutador.

```mermaid
graph TD
    A[Candidato define Pretensão S] --> B[IA gera Score Técnico C]
    B --> C{Algoritmo E-Score}
    C --> D[C / S = Indice de Eficiência]
    D --> E[Ranking de ROI para a Empresa]
    E --> F{Filtro de Orçamento}
    F -- Dentro --o G[Exibir no Topo]
    F -- Fora --o H[Exibir como Premium/High Cost]
    G --> I[Recrutador visualiza 'Barganhas Técnicas']
```

## 10. Fluxo do Recrutador Pro (Hunting & Comissões)

Como recrutadores externos utilizam a plataforma para caçar talentos.

```mermaid
sequenceDiagram
    participant R as Recrutador/Headhunter
    participant P as Plataforma (Hunting CRM)
    participant C as Candidatos
    participant E as Empresa Cliente
    
    R->>P: Realiza Busca Ativa via IA
    P-->>R: Lista de Talentos Auditados
    R->>C: Aborda e Submete Candidato para Vaga
    C->>P: Realiza Testes de IA (Speech/Tech)
    P->>E: Envia Shortlist com Selo do Recrutador
    E->>C: Contratação Finalizada
    E->>P: Paga Success Fee
    P->>R: Libera Comissão Automática na Smart Wallet
```

## 11. Fluxo de Recompensa por Retenção (3 Meses)

Como o sistema incentiva a contratação de longo prazo.

```mermaid
sequenceDiagram
    participant E as Empresa Cliente
    participant P as Plataforma (Escrow)
    participant R as Recrutador
    participant C as Candidato
    
    E->>P: Paga Success Fee + Bônus Retenção (Configurável)
    P->>R: Libera Success Fee (Imediato)
    loop Monitoramento Mensal
        C->>E: Trabalho Realizado
        E->>P: Confirma Manutenção do Vínculo
    end
    Note over P: 90 dias atingidos
    P->>R: Libera Bônus de Retenção na Smart Wallet
    R->>R: Ganha Badge de "Quality Recruiter"
```

## 12. Fluxo de Marketing e Atribuição do Recrutador

Como o sistema rastreia a origem dos candidatos trazidos por recrutadores.

```mermaid
sequenceDiagram
    participant R as Recrutador
    participant P as Plataforma (Marketing Tools)
    participant S as Redes Sociais (LinkedIn/X)
    participant C as Candidato
    
    R->>P: Gera Landing Page e Snippets
    P-->>R: Retorna Link com Attribution-ID
    R->>S: Compartilha Snippet Rastreado
    C->>S: Clica no Link/Card
    S->>P: Redireciona para Landing Page Customizada
    P->>P: Loga Origem e Recrutador (Traffic Log)
    C->>P: Realiza Cadastro/Candidatura
    P->>R: Atribui Candidato ao Pipeline do Recrutador
```
