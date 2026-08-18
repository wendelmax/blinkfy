'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import type { KycVerification, KycStatus } from '../../lib/types';

export function KycVerificationPanel() {
    const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
    const [verifications, setVerifications] = useState<KycVerification[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [initiating, setInitiating] = useState(false);
    const [activeSession, setActiveSession] = useState<{ verificationId: string; sessionId: string; expiresAt: string } | null>(null);
    const [capturing, setCapturing] = useState(false);

    async function loadStatus() {
        setLoading(true);
        setError('');
        try {
            const [status, list] = await Promise.all([
                apiFetch<KycStatus>('/api/blinkfy/candidate/kyc/status'),
                apiFetch<{ items: KycVerification[] }>('/api/blinkfy/candidate/kyc'),
            ]);
            setKycStatus(status);
            setVerifications(list.items);
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Failed to load KYC status');
        } finally {
            setLoading(false);
        }
    }

    async function initiateLiveness() {
        setInitiating(true);
        setError('');
        try {
            const result = await apiFetch<{ verificationId: string; sessionId: string; expiresAt: string }>(
                '/api/blinkfy/candidate/kyc/initiate',
                { method: 'POST', body: JSON.stringify({ triggerReason: 'onboarding', verificationType: 'liveness' }) }
            );
            setActiveSession(result);
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Failed to initiate verification');
        } finally {
            setInitiating(false);
        }
    }

    async function submitMockCapture() {
        if (!activeSession) return;
        setCapturing(true);
        setError('');
        try {
            await apiFetch(`/api/blinkfy/candidate/kyc/${activeSession.verificationId}/capture`, {
                method: 'POST',
                body: JSON.stringify({ imageBase64: 'mock_base64_image_data' }),
            });
            setActiveSession(null);
            await loadStatus();
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Failed to submit capture');
        } finally {
            setCapturing(false);
        }
    }

    async function revokeVerification(verificationId: string) {
        try {
            await apiFetch(`/api/blinkfy/candidate/kyc/${verificationId}/revoke`, { method: 'POST' });
            await loadStatus();
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Failed to revoke');
        }
    }

    function statusBadge(status: string) {
        const colors: Record<string, string> = {
            approved: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            processing: 'bg-blue-100 text-blue-800',
            rejected: 'bg-red-100 text-red-800',
            expired: 'bg-gray-100 text-gray-600',
        };
        return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
    }

    return (
        <section className="p-5 border border-border-strong rounded-[10px]" aria-labelledby="kyc-heading">
            <div className="flex items-center justify-between mb-3">
                <h3 id="kyc-heading" className="font-semibold text-lg">Identity Verification (KYC)</h3>
                <button onClick={() => void loadStatus()} disabled={loading} className="text-xs bg-primary text-white px-3 py-1 rounded hover:opacity-90 disabled:opacity-50">
                    {loading ? 'Loading...' : 'Load'}
                </button>
            </div>

            <p className="text-text-muted text-xs mb-4">
                Biometric liveness detection ensures your identity. Only cryptographic hashes of biometric data are stored — no raw images or embeddings are retained.
            </p>

            {error && <p role="alert" className="text-red-600 text-sm mb-3">{error}</p>}

            {kycStatus && (
                <div className={`p-3 rounded mb-4 ${kycStatus.verified ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                            {kycStatus.verified ? 'Identity Verified' : 'Not Verified'}
                        </span>
                        {kycStatus.isExpired && <span className="text-xs text-yellow-600">(Expired)</span>}
                    </div>
                    {kycStatus.verification && (
                        <div className="text-xs text-text-muted mt-1">
                            Verified: {new Date(kycStatus.verification.verifiedAt).toLocaleDateString()}
                            {kycStatus.verification.expiresAt && ` — Expires: ${new Date(kycStatus.verification.expiresAt).toLocaleDateString()}`}
                        </div>
                    )}
                </div>
            )}

            {!kycStatus?.verified && !activeSession && (
                <button onClick={() => void initiateLiveness()} disabled={initiating} className="text-sm bg-primary text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50 mb-4">
                    {initiating ? 'Initiating...' : 'Start Liveness Check'}
                </button>
            )}

            {activeSession && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
                    <h4 className="font-medium text-sm mb-2">Liveness Challenge Active</h4>
                    <p className="text-xs text-text-muted mb-2">
                        Session expires: {new Date(activeSession.expiresAt).toLocaleTimeString()}
                    </p>
                    <div className="flex gap-2">
                        <button onClick={() => void submitMockCapture()} disabled={capturing} className="text-sm bg-primary text-white px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50">
                            {capturing ? 'Processing...' : 'Submit Capture (Mock)'}
                        </button>
                        <button onClick={() => setActiveSession(null)} className="text-sm border border-border-strong px-3 py-1.5 rounded hover:bg-surface-secondary">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {verifications.length > 0 && (
                <div className="space-y-2 mt-4">
                    <h4 className="font-medium text-sm">Verification History</h4>
                    {verifications.map(v => (
                        <div key={v.id} className="flex items-center justify-between p-3 bg-surface-secondary rounded">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{v.verificationType}</span>
                                    {statusBadge(v.status)}
                                </div>
                                <div className="text-xs text-text-muted mt-1">
                                    {v.triggerReason && `${v.triggerReason} · `}
                                    {new Date(v.createdAt).toLocaleDateString()}
                                    {v.livenessScore != null && ` · Score: ${v.livenessScore}`}
                                </div>
                            </div>
                            {v.status === 'approved' && (
                                <button onClick={() => void revokeVerification(v.id)} className="text-xs text-red-600 hover:underline">
                                    Revoke
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {verifications.length === 0 && !loading && !activeSession && (
                <p className="text-text-muted text-sm">No verification history. Start a liveness check to verify your identity.</p>
            )}
        </section>
    );
}
