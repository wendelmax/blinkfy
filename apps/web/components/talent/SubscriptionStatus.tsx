'use client';

import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import type { BillingSubscription } from '../../lib/types';

export function SubscriptionStatus() {
    const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [upgrading, setUpgrading] = useState(false);
    const [portalLoading, setPortalLoading] = useState(false);

    useEffect(() => {
        void loadSubscription();
    }, []);

    async function loadSubscription() {
        setLoading(true);
        setError('');
        try {
            setSubscription(await apiFetch<BillingSubscription>('/api/blinkfy/billing/subscription'));
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Could not load subscription.');
        } finally { setLoading(false); }
    }

    async function handleUpgrade() {
        setUpgrading(true);
        setError('');
        try {
            const result = await apiFetch<{ url: string; sessionId: string }>('/api/blinkfy/billing/checkout', { method: 'POST' });
            if (result.url) window.location.href = result.url;
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Could not start checkout.');
        } finally { setUpgrading(false); }
    }

    async function handleManage() {
        setPortalLoading(true);
        setError('');
        try {
            const result = await apiFetch<{ url: string }>('/api/blinkfy/billing/portal', { method: 'POST', body: JSON.stringify({}) });
            if (result.url) window.location.href = result.url;
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Could not open billing portal.');
        } finally { setPortalLoading(false); }
    }

    if (loading) return <p>Loading subscription…</p>;

    const isPro = subscription?.plan === 'pro' && ['active', 'trialing'].includes(subscription?.status || '');

    return (
        <div className="p-4 border border-border-strong rounded-[10px]">
            <h3>Subscription</h3>
            {subscription && (
                <div className="grid gap-2 mt-2">
                    <p>Plan: <strong>{subscription.plan}</strong> · Status: {subscription.status}</p>
                    {subscription.currentPeriodEnd && (
                        <p>Current period ends: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                    )}
                    {subscription.plan === 'free' && (
                        <p className="text-sm text-gray-500">Upgrade to Pro for AI-powered content drafts, advanced analytics, and more.</p>
                    )}
                </div>
            )}
            <div className="flex gap-2 mt-4">
                {(!subscription || subscription.plan === 'free') && (
                    <button type="button" onClick={() => void handleUpgrade()} disabled={upgrading}>
                        {upgrading ? 'Redirecting to checkout…' : 'Upgrade to Pro'}
                    </button>
                )}
                {subscription && subscription.provider && (
                    <button type="button" onClick={() => void handleManage()} disabled={portalLoading}>
                        {portalLoading ? 'Opening portal…' : 'Manage Subscription'}
                    </button>
                )}
            </div>
            {error && <p role="alert" className="text-red-600 mt-2">{error}</p>}
        </div>
    );
}
