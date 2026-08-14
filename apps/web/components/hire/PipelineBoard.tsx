'use client';

import { useEffect, useState } from 'react';

import { apiFetch, ApiError } from '../../lib/api';
import { APPLICATION_STAGES, NEXT_APPLICATION_STAGE, type ApplicationStage, type PipelineApplication, type ScreeningDossier } from '../../lib/types';
import { ConsentBadge } from './ConsentBadge';
import { FitScoreCard } from './FitScoreCard';
import { MessageSuggestions } from './MessageSuggestions';
import { ScreeningControls } from './ScreeningControls';
import { ScreeningFeedback } from './ScreeningFeedback';
import { ScreeningEvidenceForm } from './ScreeningEvidenceForm';
import { InboundMessagePanel } from './InboundMessagePanel';
import { FollowUpPanel } from './FollowUpPanel';
import { AtsExportPreview } from './AtsExportPreview';

type PipelineBoardProps = {
    jobId: string;
    applications: PipelineApplication[];
};

function stageLabel(stage: ApplicationStage) {
    return stage.charAt(0).toUpperCase() + stage.slice(1);
}

export function PipelineBoard({ jobId, applications }: PipelineBoardProps) {
    const [items, setItems] = useState(applications);
    const [error, setError] = useState('');
    const [rejectionTarget, setRejectionTarget] = useState<PipelineApplication | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [overrides, setOverrides] = useState<Record<string, { score: string; reason: string }>>({});
    const [dossier, setDossier] = useState<ScreeningDossier | null>(null);

    useEffect(() => setItems(applications), [applications]);

    async function updateStage(application: PipelineApplication, stage: ApplicationStage, reason?: string) {
        setError('');
        try {
            const response = await apiFetch<{ application: { id: string; stage: ApplicationStage } }>(`/api/blinkfy/jobs/${jobId}/applications/${application.id}/stage`, {
                method: 'PATCH',
                body: JSON.stringify({ stage, ...(reason ? { reason } : {}) }),
            });
            setItems((current) => current.map((item) => item.id === application.id ? { ...item, stage: response.application.stage } : item));
            setRejectionTarget(null);
            setRejectionReason('');
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'The stage could not be changed.');
        }
    }

    async function applyOverride(application: PipelineApplication) {
        const override = overrides[application.id] ?? { score: '', reason: '' };
        const score = Number(override.score);
        if (!Number.isInteger(score) || score < 0 || score > 100 || !override.reason.trim()) {
            setError('Enter a score from 0 to 100 and a reviewer reason.');
            return;
        }
        setError('');
        try {
            const response = await apiFetch<{ score: NonNullable<PipelineApplication['score']> }>(`/api/blinkfy/jobs/${jobId}/applications/${application.id}/override-score`, {
                method: 'PATCH',
                body: JSON.stringify({ score, reason: override.reason.trim() }),
            });
            setItems((current) => current.map((item) => item.id === application.id ? { ...item, score: response.score } : item));
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'The score override could not be saved.');
        }
    }

    async function openDossier(application: PipelineApplication) {
        setError('');
        try {
            setDossier(await apiFetch<ScreeningDossier>(`/api/blinkfy/jobs/${jobId}/applications/${application.id}/screening/dossier`));
        } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'The screening dossier could not be loaded.'); }
    }

    return (
        <section>
            <h2>Reviewed pipeline</h2>
            <p>Scores support human review; they never reject candidates automatically.</p>
            {error && <p role="alert">{error}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(220px, 1fr))', gap: 12, overflowX: 'auto' }}>
                {APPLICATION_STAGES.map((stage) => {
                    const inStage = items.filter((application) => application.stage === stage);
                    return (
                        <section key={stage} aria-label={`${stageLabel(stage)} column`} style={{ background: '#f5f7fa', padding: 12, borderRadius: 8 }}>
                            <h3>{stageLabel(stage)} ({inStage.length})</h3>
                            {inStage.length === 0 && <p>No candidates in this stage.</p>}
                            {inStage.map((application) => {
                                const targetStage = NEXT_APPLICATION_STAGE[application.stage as keyof typeof NEXT_APPLICATION_STAGE];
                                const override = overrides[application.id] ?? { score: '', reason: '' };
                                return (
                                    <article key={application.id} style={{ background: '#fff', padding: 12, marginBottom: 10, borderRadius: 8 }}>
                                        <strong>{application.fullName}</strong>
                                        {application.currentTitle && <p>{application.currentTitle}</p>}
                                        <ConsentBadge consentRecorded={application.consentRecorded} />
                                        <ScreeningControls jobId={jobId} applicationId={application.id} candidateName={application.fullName} />
                                        <InboundMessagePanel jobId={jobId} applicationId={application.id} candidateName={application.fullName} />
                                        <FollowUpPanel jobId={jobId} applicationId={application.id} />
                                        <AtsExportPreview jobId={jobId} applicationId={application.id} />
                                        <MessageSuggestions jobId={jobId} applicationId={application.id} candidateName={application.fullName} />
                                        <button type="button" onClick={() => openDossier(application)}>Review screening dossier</button>
                                        {application.score ? <FitScoreCard score={application.score} /> : <p>Score not yet computed.</p>}
                                        {targetStage && <button type="button" onClick={() => updateStage(application, targetStage)}>Move to {stageLabel(targetStage)}</button>}
                                        {stage !== 'rejected' && stage !== 'shortlisted' && <button type="button" onClick={() => setRejectionTarget(application)}>Reject with reason</button>}
                                        <fieldset style={{ marginTop: 10 }}>
                                            <legend>Reviewer score override</legend>
                                            <label>
                                                Score
                                                <input aria-label={`Override score for ${application.fullName}`} type="number" min="0" max="100" value={override.score} onChange={(event) => setOverrides((current) => ({ ...current, [application.id]: { ...override, score: event.target.value } }))} />
                                            </label>
                                            <label>
                                                Reviewer reason
                                                <input aria-label={`Override reason for ${application.fullName}`} value={override.reason} onChange={(event) => setOverrides((current) => ({ ...current, [application.id]: { ...override, reason: event.target.value } }))} />
                                            </label>
                                            <button type="button" onClick={() => applyOverride(application)}>Save override</button>
                                        </fieldset>
                                    </article>
                                );
                            })}
                        </section>
                    );
                })}
            </div>
            {rejectionTarget && (
                <div role="dialog" aria-modal="true" aria-labelledby="rejection-title" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'grid', placeItems: 'center' }}>
                    <form onSubmit={(event) => { event.preventDefault(); if (rejectionReason.trim()) updateStage(rejectionTarget, 'rejected', rejectionReason.trim()); }} style={{ background: '#fff', padding: 24, maxWidth: 480 }}>
                        <h2 id="rejection-title">Record a human reviewer reason</h2>
                        <p>Rejecting {rejectionTarget.fullName} requires a documented reason.</p>
                        <label htmlFor="rejection-reason">Reason</label>
                        <textarea id="rejection-reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} required rows={4} style={{ display: 'block', width: '100%' }} />
                        <button type="button" onClick={() => setRejectionTarget(null)}>Cancel</button>
                        <button type="submit" disabled={!rejectionReason.trim()}>Confirm rejection</button>
                    </form>
                </div>
            )}
            {dossier && <div role="dialog" aria-modal="true" aria-labelledby="dossier-title" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'grid', placeItems: 'center' }}>
                <section style={{ background: '#fff', padding: 24, maxWidth: 720, maxHeight: '80vh', overflow: 'auto' }}>
                    <h2 id="dossier-title">Screening dossier: {dossier.application.fullName}</h2>
                    <p>Session: {dossier.session.status} · Consent version: {dossier.session.consentVersion ?? 'not specified'}</p>
                    {dossier.summary && <section aria-label="Screening review summary" style={{ padding: 12, background: '#f5f7fa', borderRadius: 8 }}>
                        <h3>Human review summary</h3>
                        <p>{dossier.summary.reviewReady ? 'Ready for human review' : 'Evidence is still incomplete'}</p>
                        <p>{dossier.summary.evidenceCount} evidence item(s) · Score: {dossier.summary.score ?? 'not available'}</p>
                        <ul>
                            <li>Recording: {dossier.summary.evidenceByKind.recording ? 'available' : 'missing'}</li>
                            <li>Transcript: {dossier.summary.evidenceByKind.transcript ? 'available' : 'missing'}</li>
                            <li>Insight: {dossier.summary.evidenceByKind.insight ? 'available' : 'missing'}</li>
                        </ul>
                        <small>Automated screening never makes a hiring decision. A human reviewer must assess the evidence.</small>
                    </section>}
                    {dossier.retention && <p role="status">Retention: {dossier.retention.expiredEvidenceIds.length} expired evidence item(s), {dossier.retention.expiringCount} with a deadline. Review retention before sharing this dossier.</p>}
                    {dossier.evidences.length === 0 ? <p>No screening evidence recorded yet.</p> : dossier.evidences.map((evidence) => <article key={evidence.id}><h3>{evidence.kind}</h3>{evidence.confidence != null && <p>Confidence: {evidence.confidence}%</p>} {evidence.uri && <p><a href={evidence.uri}>Open evidence</a></p>} {evidence.content && <p>{evidence.content}</p>}</article>)}
                    <ScreeningEvidenceForm jobId={jobId} applicationId={dossier.application.id} onAdded={(evidence) => setDossier((current) => current ? { ...current, evidences: [...current.evidences, evidence] } : current)} />
                    <ScreeningFeedback jobId={jobId} applicationId={dossier.application.id} candidateName={dossier.application.fullName} />
                    <button type="button" onClick={() => setDossier(null)}>Close dossier</button>
                </section>
            </div>}
        </section>
    );
}
