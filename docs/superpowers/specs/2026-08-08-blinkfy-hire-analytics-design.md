# Blinkfy Hire Analytics — Design

## Objetivo

Adicionar uma camada de analytics operacional ao Blinkfy Hire Core para que recrutadores e gestores acompanhem a saúde do pipeline por cliente e vaga. O módulo será consultivo: mede o funil e evidencia gargalos, mas não rejeita candidatos nem altera estágios automaticamente.

## Escopo do MVP

O MVP expõe um resumo filtrável por cliente, com filtro opcional por vaga e intervalo de datas:

- totais por estágio (`mapped`, `reviewed`, `interested`, `screened`, `shortlisted`, `rejected`);
- conversão entre estágios, calculada sobre aplicações distintas do escopo;
- tempo médio em cada estágio, usando o histórico de transições auditadas;
- consentimentos de `client_presentation` ativos e revogados;
- média, mínimo e máximo do Fit Score disponível;
- última atualização e intervalo consultado.

O período padrão é todo o histórico do cliente. Datas são interpretadas em UTC e o intervalo é inclusivo no início e exclusivo no fim (`from <= event < to`). Aplicações sem histórico suficiente aparecem nos totais, mas não entram no cálculo de duração.

## Segurança e escopo de dados

O endpoint usa a mesma autenticação e middleware de workspace do Hire Core. O `clientId` deve pertencer ao workspace ativo e o `jobId`, quando fornecido, deve pertencer ao cliente. Nenhuma consulta agrega dados de outro cliente, mesmo quando o candidato existe no mesmo workspace.

O payload não inclui email, telefone, conteúdo de consentimento ou documentos privados. O dashboard mostra apenas contagens, médias e identificadores necessários para navegação. Os critérios de score continuam consultivos e não são usados para rejeição automática.

## API

`GET /api/blinkfy/clients/:clientId/analytics`

Query parameters:

- `jobId` opcional;
- `from` opcional, ISO-8601;
- `to` opcional, ISO-8601.

Resposta:

```json
{
  "scope": { "clientId": "...", "jobId": null, "from": null, "to": null },
  "applications": { "total": 12, "byStage": { "mapped": 4, "reviewed": 3 } },
  "conversion": { "mappedToReviewed": 0.75, "reviewedToInterested": 0.33 },
  "stageTime": { "reviewed": { "averageSeconds": 86400, "sampleSize": 3 } },
  "consent": { "active": 8, "revoked": 1, "missing": 3 },
  "score": { "count": 9, "average": 78.4, "minimum": 62, "maximum": 94 },
  "generatedAt": "2026-08-08T12:00:00.000Z"
}
```

Percentuais são números entre `0` e `1`, arredondados a quatro casas. Ausência de denominador retorna `null`, não zero, para distinguir “sem amostra” de conversão zero.

## Modelo de cálculo

O serviço consulta aplicações e seus snapshots de score dentro do escopo autorizado. A auditoria de mudanças de estágio é a fonte do tempo em etapa. Quando não houver evento anterior, o início da aplicação é usado somente para o primeiro estágio; quando não houver evento de saída, a duração fica em aberto e não entra na média.

Para evitar dupla contagem, cada aplicação contribui no máximo uma vez para cada estágio e para cada transição. Conversão usa o conjunto de aplicações que alcançou a etapa de origem como denominador. Consentimento é contado por estado atual, com revogações separadas no período consultado.

## UI

Adicionar uma página `/hire/analytics` com:

- seletor de cliente e vaga já usados pelo workspace;
- filtro de datas com estado vazio e erro explícitos;
- cards de volume, conversão, consentimento e score;
- funil por estágio;
- tabela de tempo médio por estágio e amostra;
- link para abrir a vaga/pipeline correspondente.

A interface não usa dados fictícios: carregamento, ausência de dados, erro de autorização e resposta parcial têm estados distintos.

## Testes e observabilidade

- testes de serviço para escopo, datas, conversões sem denominador, duração sem histórico e consentimento revogado;
- testes de rota para acesso autorizado e bloqueio cross-workspace/client;
- teste E2E com o fluxo existente, verificando que a shortlist aparece no analytics;
- auditoria existente continua sendo a fonte de transições; a consulta em si não gera eventos.

## Fora do escopo

- data warehouse, exportação BI e relatórios agendados;
- LTV, CAC, ROI ou churn corporativo;
- comparações entre workspaces;
- automação de outreach, scraping do LinkedIn ou decisões de contratação;
- análise de voz e integrações externas.
