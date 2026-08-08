'use client';

import { FormEvent, useMemo, useState } from 'react';

import { apiFetch, ApiError } from '../../lib/api';
import type { BlinkfyJob, JobScorecardWeights } from '../../lib/types';

const labels: Array<[keyof JobScorecardWeights, string]> = [
    ['skills', 'Skills'],
    ['experience', 'Experience'],
    ['context', 'Context'],
    ['preferences', 'Preferences'],
    ['signals', 'Signals'],
];

const defaultWeights: JobScorecardWeights = { skills: 35, experience: 25, context: 15, preferences: 15, signals: 10 };

type JobInput = {
    title: string;
    description: string;
    location: string;
    workModel: string;
    requirements: string[];
    weights: JobScorecardWeights;
};

type JobFormProps = {
    clientId: string;
    createJob?: (input: JobInput) => Promise<BlinkfyJob>;
    onCreated?: (job: BlinkfyJob) => void;
};

export function jobErrorMessage(caught: unknown) {
    if (caught instanceof ApiError || (caught && typeof caught === 'object' && 'message' in caught)) {
        return String((caught as { message: unknown }).message);
    }
    return 'The job could not be created.';
}

export function JobForm({ clientId, createJob, onCreated }: JobFormProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [workModel, setWorkModel] = useState('');
    const [requirementsText, setRequirementsText] = useState('');
    const [weights, setWeights] = useState<JobScorecardWeights>(defaultWeights);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const total = useMemo(() => Object.values(weights).reduce((sum, value) => sum + value, 0), [weights]);

    const submitJob = createJob ?? ((input: JobInput) => apiFetch<BlinkfyJob>(`/api/blinkfy/clients/${clientId}/jobs`, {
        method: 'POST',
        body: JSON.stringify(input),
    }));

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        if (!clientId) {
            setError('Choose an active client before creating a job.');
            return;
        }
        if (total !== 100) {
            setError('Scorecard weights must total 100.');
            return;
        }
        setSubmitting(true);
        try {
            const job = await submitJob({
                title,
                description,
                location,
                workModel,
                requirements: requirementsText.split('\n').map((value) => value.trim()).filter(Boolean),
                weights,
            });
            onCreated?.(job);
        } catch (caught) {
            setError(jobErrorMessage(caught));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 14, maxWidth: 720 }}>
            <div>
                <label htmlFor="job-title">Job title</label>
                <input id="job-title" value={title} onChange={(event) => setTitle(event.target.value)} required style={{ display: 'block', width: '100%' }} />
            </div>
            <div>
                <label htmlFor="job-description">Description</label>
                <textarea id="job-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} style={{ display: 'block', width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
                <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
                <label>Work model<input value={workModel} onChange={(event) => setWorkModel(event.target.value)} /></label>
            </div>
            <div>
                <label htmlFor="job-requirements">Requirements (one per line)</label>
                <textarea id="job-requirements" value={requirementsText} onChange={(event) => setRequirementsText(event.target.value)} rows={5} style={{ display: 'block', width: '100%' }} />
            </div>
            <fieldset>
                <legend>Scorecard weights</legend>
                {labels.map(([key, label]) => (
                    <label key={key} style={{ display: 'block' }}>
                        {label}
                        <input
                            aria-label={`${label} weight`}
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={weights[key]}
                            onChange={(event) => setWeights((current) => ({ ...current, [key]: Number(event.target.value) || 0 }))}
                        />
                    </label>
                ))}
                <p aria-live="polite">Total: {total}/100</p>
            </fieldset>
            {error && <p role="alert">{error}</p>}
            <button type="submit" disabled={submitting || total !== 100}>{submitting ? 'Creating…' : 'Create job'}</button>
        </form>
    );
}
