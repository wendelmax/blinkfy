'use client';

import { FormEvent, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import type { TalentDraft, TalentDraftHistoryItem, TalentNetworkRecommendation, TalentPlanCatalog, TalentPositioningAnalytics, TalentUsageAnalytics } from '../../lib/types';

const ACTION_LABELS: Record<string, string> = {
    targetRole: 'target role',
    headline: 'headline',
    bio: 'bio',
    skills: 'skills',
    location: 'location',
    workModel: 'work model',
    availability: 'availability',
    portfolioUrl: 'portfolio link',
    set_visibility: 'visibility',
};

export function CandidateGrowthPanel({ analytics }: { analytics: TalentPositioningAnalytics }) {
    const [topic, setTopic] = useState('');
    const [targetRole, setTargetRole] = useState('');
    const [format, setFormat] = useState<'post' | 'comment' | 'connection'>('post');
    const [resumeDraft, setResumeDraft] = useState<TalentDraft | null>(null);
    const [engagementDraft, setEngagementDraft] = useState<TalentDraft | null>(null);
    const [busy, setBusy] = useState<'resume' | 'engagement' | null>(null);
    const [error, setError] = useState('');
    const [recommendations, setRecommendations] = useState<TalentNetworkRecommendation[]>([]);
    const [networkLoaded, setNetworkLoaded] = useState(false);
    const [usage, setUsage] = useState<TalentUsageAnalytics | null>(null);
    const [history, setHistory] = useState<TalentDraftHistoryItem[]>([]);
    const [plans, setPlans] = useState<TalentPlanCatalog | null>(null);
    const [upgradeIntent, setUpgradeIntent] = useState<{ status: string; charged: boolean; subscriptionChanged: boolean } | null>(null);

    async function loadRecommendations() {
        setError('');
        try {
            const result = await apiFetch<{ items: TalentNetworkRecommendation[] }>('/api/blinkfy/talent/network/recommendations');
            setRecommendations(result.items);
            setNetworkLoaded(true);
        } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Network recommendations could not be loaded.'); }
    }

    async function loadUsage() {
        setError('');
        try { setUsage(await apiFetch<TalentUsageAnalytics>('/api/blinkfy/talent/analytics/usage')); }
        catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Usage analytics could not be loaded.'); }
    }

    async function loadHistory() {
        setError('');
        try { const result = await apiFetch<{ items: TalentDraftHistoryItem[] }>('/api/blinkfy/talent/drafts'); setHistory(result.items); }
        catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Draft history could not be loaded.'); }
    }

    async function loadPlans() {
        setError('');
        try { setPlans(await apiFetch<TalentPlanCatalog>('/api/blinkfy/talent/plans')); }
        catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Plan catalog could not be loaded.'); }
    }

    async function requestUpgrade() {
        setError('');
        try {
            const result = await apiFetch<{ intent: { status: string; charged: boolean; subscriptionChanged: boolean } }>('/api/blinkfy/talent/plans/upgrade-intent', { method: 'POST' });
            setUpgradeIntent(result.intent);
        } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Upgrade request could not be created.'); }
    }

    async function reviewDraft(id: string, status: 'approved' | 'rejected') {
        setError('');
        try {
            const result = await apiFetch<{ draft: TalentDraftHistoryItem }>(`/api/blinkfy/talent/drafts/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
            setHistory((current) => current.map((item) => item.id === id ? result.draft : item));
        } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Draft review could not be saved.'); }
    }

    async function createResumeDraft() {
        setBusy('resume');
        setError('');
        try {
            const result = await apiFetch<{ draft: TalentDraft }>('/api/blinkfy/talent/drafts/resume', {
                method: 'POST',
                body: JSON.stringify({ targetRole }),
            });
            setResumeDraft(result.draft);
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Resume draft could not be created.');
        } finally { setBusy(null); }
    }

    async function createEngagementDraft(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy('engagement');
        setError('');
        try {
            const result = await apiFetch<{ draft: TalentDraft }>('/api/blinkfy/talent/drafts/engagement', {
                method: 'POST',
                body: JSON.stringify({ topic, format, tone: 'professional' }),
            });
            setEngagementDraft(result.draft);
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Engagement draft could not be created.');
        } finally { setBusy(null); }
    }

    return <section aria-labelledby="candidate-growth-heading" style={{ marginTop: 24, padding: 20, border: '1px solid #d8dee9', borderRadius: 10 }}>
        <h2 id="candidate-growth-heading">Candidate growth</h2>
        <p>Use your profile to build a stronger network. Every generated asset is a draft and requires your approval before sharing.</p>

        <div style={{ display: 'grid', gap: 8, margin: '16px 0' }}>
            <strong>Positioning: {analytics.profileCompleteness.percentage}% complete</strong>
            <progress aria-label="Profile completeness" value={analytics.profileCompleteness.percentage} max="100" />
            <span>{analytics.profileCompleteness.completed} of {analytics.profileCompleteness.total} positioning fields completed · {analytics.activeConsentCount} active consent(s)</span>
            <span>Discoverability: {analytics.discoverability === 'enabled' ? 'enabled' : 'private'}</span>
            {analytics.nextActions.length > 0 && <small>Next: {analytics.nextActions.map((action) => ACTION_LABELS[action] ?? action).join(', ')}</small>}
        </div>

        <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
            <label htmlFor="target-role">Target role for resume draft</label>
            <input id="target-role" value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder="e.g. Account Executive" />
            <button type="button" onClick={() => void createResumeDraft()} disabled={busy !== null}>{busy === 'resume' ? 'Creating…' : 'Create resume draft'}</button>
        </div>

        <form onSubmit={createEngagementDraft} style={{ display: 'grid', gap: 8 }}>
            <label htmlFor="engagement-topic">Topic for a value-network draft</label>
            <input id="engagement-topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. discovery-led sales" required />
            <label htmlFor="engagement-format">Draft type</label>
            <select id="engagement-format" value={format} onChange={(event) => setFormat(event.target.value as typeof format)}>
                <option value="post">Post</option><option value="comment">Comment</option><option value="connection">Connection note</option>
            </select>
            <button type="submit" disabled={busy !== null}>{busy === 'engagement' ? 'Creating…' : 'Create engagement draft'}</button>
        </form>

        <section aria-labelledby="value-network-heading" style={{ marginTop: 16 }}>
            <h3 id="value-network-heading">Value network suggestions</h3>
            <p>These are private recommendations. Nothing is contacted or published automatically.</p>
            <button type="button" onClick={() => void loadRecommendations()}>Find relevant connections</button>
            {networkLoaded && (recommendations.length === 0 ? <p>No matching connections found.</p> : <ul>{recommendations.map((recommendation) => <li key={recommendation.id}><strong>{recommendation.name}</strong> · {recommendation.role} <small>· approval required</small></li>)}</ul>)}
        </section>

        <section aria-labelledby="talent-usage-heading" style={{ marginTop: 16 }}>
            <h3 id="talent-usage-heading">Plan usage</h3>
            <button type="button" onClick={() => void loadUsage()}>View plan usage</button>
            {usage && <div role="status"><p>Plan: {usage.plan} · Status: {usage.status}</p><ul>{usage.usage.map((item) => <li key={item.feature}>{item.feature}: {item.used}/{item.limit} used · {item.remaining} remaining</li>)}</ul><p>Draft performance: {usage.drafts.total} total · {usage.drafts.byStatus.pending} pending · {usage.drafts.byStatus.approved} approved · {usage.drafts.byStatus.rejected} rejected</p></div>}
        </section>

        <section aria-labelledby="talent-draft-history-heading" style={{ marginTop: 16 }}>
            <h3 id="talent-draft-history-heading">Draft history</h3>
            <button type="button" onClick={() => void loadHistory()}>View saved drafts</button>
            {history.length > 0 && <ul>{history.map((item) => <li key={item.id}>{item.kind} · {item.status} · {new Date(item.createdAt).toLocaleDateString()} {item.status === 'pending' && <><button type="button" onClick={() => void reviewDraft(item.id, 'approved')}>Approve</button><button type="button" onClick={() => void reviewDraft(item.id, 'rejected')}>Reject</button></>}</li>)}</ul>}
        </section>

        <section aria-labelledby="talent-plans-heading" style={{ marginTop: 16 }}>
            <h3 id="talent-plans-heading">Plans</h3>
            <small>Checkout is not charged here; a human-approved billing flow is required.</small>
            <button type="button" onClick={() => void loadPlans()}>Compare Free and Pro</button>
            {plans && <div role="status"><p>Current plan: {plans.currentPlan} · {plans.status}</p><ul>{plans.plans.map((plan) => <li key={plan.id}>{plan.id}: {plan.limits['content.draft']} content drafts and {plan.limits['comment.draft']} comment drafts per period</li>)}</ul>{plans.currentPlan === 'free' && <button type="button" onClick={() => void requestUpgrade()}>Request Pro upgrade</button>}</div>}
            {upgradeIntent && <p role="status">Upgrade request: {upgradeIntent.status} · charged: {String(upgradeIntent.charged)} · subscription changed: {String(upgradeIntent.subscriptionChanged)}</p>}
        </section>

        {error && <p role="alert">{error}</p>}
        {resumeDraft && <article aria-label="Resume draft" style={{ marginTop: 16 }}><h3>Resume draft</h3><p>{String(resumeDraft.summary ?? 'No summary generated.')}</p><small>Draft only · review before using</small></article>}
        {engagementDraft && <article aria-label="Engagement draft" style={{ marginTop: 16 }}><h3>Engagement draft</h3><p>{String(engagementDraft.content ?? '')}</p><small>Draft only · review before sharing</small></article>}
    </section>;
}
