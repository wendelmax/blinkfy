'use client';

import { ChangeEvent, useState } from 'react';

import { apiFetch, ApiError } from '../../lib/api';
import type { CandidateImportResult } from '../../lib/types';

export function CandidateImport({ clientId }: { clientId: string }) {
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<CandidateImportResult | null>(null);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);

    function chooseFile(event: ChangeEvent<HTMLInputElement>) {
        setFile(event.target.files?.[0] ?? null);
        setResult(null);
        setError('');
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
                    <p>Sharing requires recorded client-presentation consent for each candidate.</p>
                </section>
            )}
        </section>
    );
}
