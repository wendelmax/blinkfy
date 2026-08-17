'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError, getActiveWorkspaceId } from '../../lib/api';
import type { CandidateTalentProfile, TalentConsentSummary, TalentPositioningAnalytics } from '../../lib/types';
import { ConsentCenter } from '../../components/talent/ConsentCenter';
import { CandidateGrowthPanel } from '../../components/talent/CandidateGrowthPanel';
import { TalentProfileForm } from '../../components/talent/TalentProfileForm';
import { VisibilityControl } from '../../components/talent/VisibilityControl';
import { ScreeningInvitations } from '../../components/talent/ScreeningInvitations';
import { SubscriptionStatus } from '../../components/talent/SubscriptionStatus';
import { NfeDashboard } from '../../components/talent/NfeDashboard';

export default function TalentPage() {
    const [profile, setProfile] = useState<CandidateTalentProfile | null>(null);
    const [consents, setConsents] = useState<TalentConsentSummary[]>([]);
    const [analytics, setAnalytics] = useState<TalentPositioningAnalytics | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [message, setMessage] = useState('');

    async function load() {
        try {
            const [nextProfile, nextConsents, nextAnalytics] = await Promise.all([
                apiFetch<CandidateTalentProfile>('/api/blinkfy/talent/profile'),
                apiFetch<{ items: TalentConsentSummary[] }>('/api/blinkfy/talent/consents'),
                apiFetch<TalentPositioningAnalytics>('/api/blinkfy/talent/analytics/positioning'),
            ]);
            setProfile(nextProfile);
            setConsents(nextConsents.items);
            setAnalytics(nextAnalytics);
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

    return (
        <main className="max-w-[900px] mx-auto py-8 px-5">
            <Link href="/" className="text-sm text-text-muted hover:text-primary mb-4 inline-block">
                &larr; Blinkfy home
            </Link>
            <h1 className="text-2xl font-bold mb-2">Blinkfy Talent</h1>
            <p className="text-text-muted text-sm mb-6">
                Your profile is free. You control who can discover it and which companies may receive it.
            </p>
            {state === 'loading' && <p className="text-text-muted text-sm">Loading your profile...</p>}
            {state === 'error' && <p role="alert">{message}</p>}
            {state === 'ready' && profile && analytics && (
                <div className="space-y-6">
                    <TalentProfileForm profile={profile} onSaved={setProfile} />
                    <VisibilityControl visibility={profile.visibility} onChange={changeVisibility} />
                    <SubscriptionStatus />
                    <ConsentCenter initialItems={consents} />
                    <CandidateGrowthPanel analytics={analytics} />
                    <NfeDashboard />
                    <ScreeningInvitations />
                </div>
            )}
        </main>
    );
}
