# Blinkfy Screen — Dossiê de Screening para Revisão Humana

## Objetivo

Entregar a primeira fatia operacional do M3: permitir que uma sessão de screening consentida acumule evidências (transcrição, gravação e insights) e que um recrutador autorizado consulte um dossiê consolidado para revisão humana. A solução não rejeita candidatos, não inicia entrevista sem consentimento e não expõe evidências fora do workspace/client autorizados.

## Escopo

### Incluído

- Endpoint protegido para registrar evidências de uma sessão existente.
- Endpoint protegido para consultar o dossiê mais recente de uma candidatura.
- Validação de que a sessão está consentida e pertence à candidatura, vaga e workspace do requisitante.
- Resposta consolidada com status/consentimento da sessão, evidências, score explicável vigente e metadados da candidatura.
- Auditoria de inclusão de evidência e consulta do dossiê sem registrar conteúdo sensível no metadata.
- Testes de autorização, consentimento, isolamento entre clientes, validação de payload e serialização.

### Fora do escopo

- Integração real de telefonia, STT ou provedor de voz.
- Rejeição automática, ranking automático ou avanço de etapa.
- Upload binário; a primeira versão recebe `uri` e/ou `content` já processados por um worker externo.
- Retenção automática e exclusão agendada; os campos existentes de retenção serão preservados para o worker futuro.

## Contrato da API

### Registrar evidência

`POST /api/blinkfy/jobs/:jobId/applications/:applicationId/screening/evidence`

Requer papel `owner`, `admin` ou `recruiter`. Payload:

```json
{
  "kind": "transcript|recording|insight",
  "uri": "https://storage.example/transcript.json",
  "content": "texto opcional",
  "confidence": 92,
  "retentionUntil": "2026-09-30T00:00:00.000Z"
}
```

`kind` é obrigatório. Pelo menos um entre `uri` e `content` deve ser informado; `confidence`, quando informado, é inteiro de 0 a 100. A sessão deve estar em `consented`, `scheduled`, `in_progress` ou `completed`. O endpoint retorna a evidência criada e nunca inclui conteúdo em eventos de auditoria.

### Consultar dossiê

`GET /api/blinkfy/jobs/:jobId/applications/:applicationId/screening/dossier`

Requer papel `owner`, `admin`, `recruiter` ou `viewer`. Retorna:

```json
{
  "application": { "id": "...", "jobId": "...", "stage": "screened", "candidate": { "id": "...", "fullName": "..." } },
  "session": { "id": "...", "status": "completed", "consentedAt": "...", "consentVersion": "v1", "scheduledAt": "..." },
  "evidences": [{ "id": "...", "kind": "transcript", "uri": "...", "content": "...", "confidence": 92, "retentionUntil": "..." }],
  "score": { "score": 84, "confidence": "high", "factors": [], "gaps": [], "policyVersion": "..." }
}
```

O dossiê usa a sessão mais recente não retirada. Se não houver sessão, responde `404`; se houver sessão sem consentimento, responde `403` sem revelar evidências. O score é o snapshot mais recente e pode ser `null`.

## Fluxo e segurança

1. O middleware autentica e resolve o workspace.
2. O controller localiza a candidatura por `jobId`, `applicationId` e `workspaceId` do job/candidato.
3. Para escrita, a sessão é bloqueada dentro de transação e o status de consentimento é revalidado antes da inserção.
4. Para leitura, a sessão e as evidências são carregadas sob o mesmo escopo; nenhum ID de outro workspace/client é aceito.
5. A auditoria registra apenas ids, tipo da evidência e status, nunca transcript, URI privada ou insights.

## Testes e aceite

- Evidência válida é criada para sessão consentida.
- Evidência sem kind ou sem uri/content retorna `422`.
- Sessão convidada, retirada ou inexistente não permite escrita/leitura de evidências.
- Usuário sem papel adequado recebe `403`.
- Job/application de outro workspace ou client retorna `404`.
- Dossiê retorna evidências ordenadas por criação e score vigente sem vazar conteúdo em auditoria.
- Suíte API, build compartilhado e migrações devem passar.

