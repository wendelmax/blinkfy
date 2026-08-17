'use client';

import { ChangeEvent, useState } from 'react';

import { apiFetch, ApiError } from '../../lib/api';
import type { CandidateImportResult } from '../../lib/types';

export function CandidateImport({ clientId }: { clientId: string }) {
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<CandidateImportResult | null>(null);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [evidenceByCandidate, setEvidenceByCandidate] = useState<Record<string, string>>({});
    const [jobIdByCandidate, setJobIdByCandidate] = useState<Record<string, string>>({});
    const [consentedCandidateIds, setConsentedCandidateIds] = useState<Record<string, boolean>>({});
    const [sharedCandidateIds, setSharedCandidateIds] = useState<Record<string, boolean>>({});

    function chooseFile(event: ChangeEvent<HTMLInputElement>) {
        setFile(event.target.files?.[0] ?? null);
        setResult(null);
        setError('');
        setEvidenceByCandidate({});
        setJobIdByCandidate({});
        setConsentedCandidateIds({});
        setSharedCandidateIds({});
    }

    async function recordConsent(candidateId: string) {
        const evidence = evidenceByCandidate[candidateId]?.trim();
        if (!evidence) {
            setError("Record the candidate's consent evidence before sharing.");
            return;
        }
        setError('');
        try {
            await apiFetch(`/api/blinkfy/candidates/${candidateId}/consents`, {
                method: 'POST',
                body: JSON.stringify({ purpose: 'client_presentation', clientId, evidence }),
            });
            setConsentedCandidateIds((current) => ({ ...current, [candidateId]: true }));
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Consent could not be recorded.');
        }
    }

    async function shareCandidate(candidateId: string) {
        setError('');
        try {
            const jobId = jobIdByCandidate[candidateId]?.trim();
            await apiFetch(`/api/blinkfy/candidates/${candidateId}/share`, {
                method: 'POST',
                body: JSON.stringify({ clientId, ...(jobId ? { jobId } : {}) }),
            });
            setSharedCandidateIds((current) => ({ ...current, [candidateId]: true }));
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Candidate could not be shared for review.');
        }
    }

    async function importCsv() {
        if (!clientId) return setError('Choose an active client before importing candidates.');
        if (!file) return setError('Choose a CSV file to import.');
        setUploading(true);
        setError('');
        try {
            const csv = await file.text();
            const imported = await apiFetch<CandidateImportResult>(`/api/blinkfy/clients/${clientId}/candidates/import`, {
                method: 'POST',
                body: JSON.stringify({ csv, filename: file.name }),
            });
            setResult(imported);
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Candidates could not be imported.');
        } finally {
            setUploading(false);
        }
    }

    return (
        <section>
            <p>Import candidates from a permitted CSV source. Imported records remain private until client-presentation consent is recorded.</p>
            <label htmlFor="candidate-csv">Candidate CSV</label>
            <input id="candidate-csv" type="file" accept=".csv,text/csv" onChange={chooseFile} />
            <button type="button" onClick={importCsv} disabled={uploading}>{uploading ? 'Importing…' : 'Import candidates'}</button>
            {error && <p role="alert">{error}</p>}
            {result && (
                <section aria-live="polite">
                    <h2>Import result</h2>
                    <p>Valid rows imported: {result.created}</p>
                    <p>Duplicate rows: {result.duplicates.length}</p>
                    <p>Invalid rows: {result.invalidRows.length}</p>
                    {result.invalidRows.length > 0 && <ul>{result.invalidRows.map((row) => <li key={`${row.row}-${row.field}`}>Row {row.row}: {row.message}</li>)}</ul>}
                    {result.candidates.length > 0 && <>
                        <h3>Review consent before sharing</h3>
                        <p>Each candidate remains private until a recruiter records evidence of consent for this client. Nothing is shared automatically.</p>
                        {result.candidates.map((candidate) => {
                            const consentRecorded = consentedCandidateIds[candidate.id];
                            const shared = sharedCandidateIds[candidate.id];
                            return (
                                <fieldset key={candidate.id} className="mt-3">
                                    <legend>{candidate.fullName}</legend>
                                    <label>
                                        Consent evidence
                                        <input aria-label={`Consent evidence for ${candidate.fullName}`} value={evidenceByCandidate[candidate.id] ?? ''} onChange={(event) => setEvidenceByCandidate((current) => ({ ...current, [candidate.id]: event.target.value }))} placeholder="e.g. candidate email confirmation" disabled={consentRecorded} />
                                    </label>
                                    {!consentRecorded && <button type="button" onClick={() => recordConsent(candidate.id)}>Record consent</button>}
                                    {consentRecorded && <>
                                        <p>Consent recorded. The candidate may now be shared for human review.</p>
                                        <label>
                                            Job ID (optional)
                                            <input aria-label={`Job ID for ${candidate.fullName}`} value={jobIdByCandidate[candidate.id] ?? ''} onChange={(event) => setJobIdByCandidate((current) => ({ ...current, [candidate.id]: event.target.value }))} placeholder="Add to a job pipeline" disabled={shared} />
                                        </label>
                                        {!shared && <button type="button" onClick={() => shareCandidate(candidate.id)}>Share for review</button>}
                                        {shared && <p>Shared for human review.</p>}
                                    </>}
                                </fieldset>
                            );
                        })}
                    </>}
                </section>
            )}
        </section>
    );
}
