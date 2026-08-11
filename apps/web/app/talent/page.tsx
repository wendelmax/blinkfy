'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError, getActiveWorkspaceId } from '../../lib/api';
import type { CandidateTalentProfile, TalentConsentSummary } from '../../lib/types';
import { ConsentCenter } from '../../components/talent/ConsentCenter';
import { TalentProfileForm } from '../../components/talent/TalentProfileForm';
import { VisibilityControl } from '../../components/talent/VisibilityControl';

export default function TalentPage() {
    const [profile, setProfile] = useState<CandidateTalentProfile | null>(null);
    const [consents, setConsents] = useState<TalentConsentSummary[]>([]);
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [message, setMessage] = useState('');

    async function load() {
        try {
            const [nextProfile, nextConsents] = await Promise.all([
                apiFetch<CandidateTalentProfile>('/api/blinkfy/talent/profile'),
                apiFetch<{ items: TalentConsentSummary[] }>('/api/blinkfy/talent/consents'),
            ]);
            setProfile(nextProfile);
            setConsents(nextConsents.items);
            setState('ready');
        } catch (caught) {
            const error = caught as ApiError;
            setMessage(error.status === 403 ? 'Only candidate accounts can access Blinkfy Talent.' : error.status === 401 ? 'Sign in again to manage your candidate profile.' : 'Your candidate profile is unavailable.');
            setState('error');
        }
    }

    useEffect(() => {
        if (!getActiveWorkspaceId()) {
            setState('error');
            setMessage('Choose a workspace before opening your Talent profile.');
            return;
        }
        void load();
    }, []);

    async function changeVisibility(visibility: CandidateTalentProfile['visibility']) {
        try {
            const next = await apiFetch<CandidateTalentProfile>('/api/blinkfy/talent/visibility', { method: 'PATCH', body: JSON.stringify({ visibility }) });
            setProfile(next);
        } catch (caught) {
            setMessage(caught instanceof ApiError ? caught.message : 'Visibility could not be changed.');
        }
    }

    return <main style={{ maxWidth: 900, margin: '32px auto', padding: '0 20px' }}>
        <Link href="/">← Blinkfy home</Link>
        <h1>Blinkfy Talent</h1>
        <p>Your profile is free. You control who can discover it and which companies may receive it.</p>
        {state === 'loading' && <p>Loading your profile…</p>}
        {state === 'error' && <p role="alert">{message}</p>}
        {state === 'ready' && profile && <>
            <TalentProfileForm profile={profile} onSaved={setProfile} />
            <VisibilityControl visibility={profile.visibility} onChange={changeVisibility} />
            <ConsentCenter initialItems={consents} />
        </>}
    </main>;
}
