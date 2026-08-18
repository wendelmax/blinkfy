'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import type { TaxDocument, TaxDocumentSummary } from '../../lib/types';

export function TaxDocumentPanel() {
    const [documents, setDocuments] = useState<TaxDocument[]>([]);
    const [summary, setSummary] = useState<TaxDocumentSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        formType: 'w8ben',
        fullName: '',
        countryOfBirth: '',
        permanentAddress: '',
        taxId: '',
        dateOfBirth: '',
        claimTreatyBenefits: false,
        treatyCountry: '',
        treatyArticle: '',
    });
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState<{ formType?: string; status?: string }>({});

    async function loadData() {
        setLoading(true);
        setError('');
        try {
            const [docs, sum] = await Promise.all([
                apiFetch<{ items: TaxDocument[] }>('/api/blinkfy/candidate/tax-documents' + buildQuery(filter)),
                apiFetch<TaxDocumentSummary>('/api/blinkfy/candidate/tax-documents/summary'),
            ]);
            setDocuments(docs.items);
            setSummary(sum);
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Failed to load tax documents');
        } finally {
            setLoading(false);
        }
    }

    function buildQuery(params: Record<string, string | undefined>) {
        const entries = Object.entries(params).filter(([, v]) => v);
        return entries.length ? '?' + new URLSearchParams(entries as [string, string][]).toString() : '';
    }

    async function handleCreate() {
        if (!form.fullName.trim()) { setError('Full name is required'); return; }
        setSaving(true);
        setError('');
        try {
            await apiFetch('/api/blinkfy/candidate/tax-documents', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    dateOfBirth: form.dateOfBirth || undefined,
                }),
            });
            setShowForm(false);
            setForm({ formType: 'w8ben', fullName: '', countryOfBirth: '', permanentAddress: '', taxId: '', dateOfBirth: '', claimTreatyBenefits: false, treatyCountry: '', treatyArticle: '' });
            await loadData();
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Failed to create tax document');
        } finally {
            setSaving(false);
        }
    }

    function statusBadge(status: string) {
        const colors: Record<string, string> = {
            active: 'bg-green-100 text-green-800',
            expired: 'bg-red-100 text-red-800',
            superseded: 'bg-gray-100 text-gray-600',
            pending_review: 'bg-yellow-100 text-yellow-800',
        };
        return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
    }

    function daysUntilExpiry(date: string | null) {
        if (!date) return null;
        const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days;
    }

    return (
        <section className="p-5 border border-border-strong rounded-[10px]" aria-labelledby="tax-documents-heading">
            <div className="flex items-center justify-between mb-3">
                <h3 id="tax-documents-heading" className="font-semibold text-lg">Tax Documents (W-8BEN / W-9)</h3>
                <div className="flex gap-2">
                    <select
                        className="text-xs border border-border-strong rounded px-2 py-1"
                        value={filter.formType || ''}
                        onChange={e => setFilter(f => ({ ...f, formType: e.target.value || undefined }))}
                    >
                        <option value="">All types</option>
                        <option value="w8ben">W-8BEN</option>
                        <option value="w9">W-9</option>
                    </select>
                    <select
                        className="text-xs border border-border-strong rounded px-2 py-1"
                        value={filter.status || ''}
                        onChange={e => setFilter(f => ({ ...f, status: e.target.value || undefined }))}
                    >
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="superseded">Superseded</option>
                    </select>
                    <button onClick={() => void loadData()} disabled={loading} className="text-xs bg-primary text-white px-3 py-1 rounded hover:opacity-90 disabled:opacity-50">
                        {loading ? 'Loading...' : 'Load'}
                    </button>
                </div>
            </div>

            <p className="text-text-muted text-xs mb-4">
                W-8BEN forms prevent tax withholding for foreign contractors working with US companies. Forms expire after 3 years.
            </p>

            {error && <p role="alert" className="text-red-600 text-sm mb-3">{error}</p>}

            {summary && (
                <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-surface-secondary p-3 rounded text-center">
                        <div className="text-lg font-bold">{summary.active}</div>
                        <div className="text-xs text-text-muted">Active</div>
                    </div>
                    <div className="bg-surface-secondary p-3 rounded text-center">
                        <div className="text-lg font-bold text-yellow-600">{summary.expiringSoon}</div>
                        <div className="text-xs text-text-muted">Expiring Soon</div>
                    </div>
                    <div className="bg-surface-secondary p-3 rounded text-center">
                        <div className="text-lg font-bold text-red-600">{summary.expired}</div>
                        <div className="text-xs text-text-muted">Expired</div>
                    </div>
                    <div className="bg-surface-secondary p-3 rounded text-center">
                        <div className="text-lg font-bold">{summary.total}</div>
                        <div className="text-xs text-text-muted">Total</div>
                    </div>
                </div>
            )}

            {!showForm && (
                <button onClick={() => setShowForm(true)} className="text-sm bg-primary text-white px-3 py-1.5 rounded hover:opacity-90 mb-4">
                    + Add Tax Document
                </button>
            )}

            {showForm && (
                <div className="bg-surface-secondary p-4 rounded mb-4 space-y-3">
                    <h4 className="font-medium text-sm">New Tax Document</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block text-xs">
                            Form Type
                            <select value={form.formType} onChange={e => setForm(f => ({ ...f, formType: e.target.value }))} className="w-full mt-1 border border-border-strong rounded px-2 py-1 text-sm">
                                <option value="w8ben">W-8BEN (Foreign Individual)</option>
                                <option value="w9">W-9 (US Person)</option>
                            </select>
                        </label>
                        <label className="block text-xs">
                            Full Legal Name *
                            <input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className="w-full mt-1 border border-border-strong rounded px-2 py-1 text-sm" placeholder="John Doe" />
                        </label>
                        <label className="block text-xs">
                            Country of Birth
                            <input type="text" value={form.countryOfBirth} onChange={e => setForm(f => ({ ...f, countryOfBirth: e.target.value }))} className="w-full mt-1 border border-border-strong rounded px-2 py-1 text-sm" placeholder="Brazil" />
                        </label>
                        <label className="block text-xs">
                            Tax ID (SSN/ITIN/EIN)
                            <input type="text" value={form.taxId} onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} className="w-full mt-1 border border-border-strong rounded px-2 py-1 text-sm" placeholder="XXX-XX-XXXX" />
                        </label>
                        <label className="block text-xs col-span-2">
                            Permanent Address
                            <input type="text" value={form.permanentAddress} onChange={e => setForm(f => ({ ...f, permanentAddress: e.target.value }))} className="w-full mt-1 border border-border-strong rounded px-2 py-1 text-sm" placeholder="123 Main St, City, Country" />
                        </label>
                        <label className="block text-xs">
                            Date of Birth
                            <input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} className="w-full mt-1 border border-border-strong rounded px-2 py-1 text-sm" />
                        </label>
                        <label className="block text-xs flex items-end gap-2">
                            <input type="checkbox" checked={form.claimTreatyBenefits} onChange={e => setForm(f => ({ ...f, claimTreatyBenefits: e.target.checked }))} className="rounded" />
                            Claim Tax Treaty Benefits
                        </label>
                        {form.claimTreatyBenefits && (
                            <>
                                <label className="block text-xs">
                                    Treaty Country
                                    <input type="text" value={form.treatyCountry} onChange={e => setForm(f => ({ ...f, treatyCountry: e.target.value }))} className="w-full mt-1 border border-border-strong rounded px-2 py-1 text-sm" placeholder="BR" />
                                </label>
                                <label className="block text-xs">
                                    Treaty Article
                                    <input type="text" value={form.treatyArticle} onChange={e => setForm(f => ({ ...f, treatyArticle: e.target.value }))} className="w-full mt-1 border border-border-strong rounded px-2 py-1 text-sm" placeholder="Article 12" />
                                </label>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => void handleCreate()} disabled={saving} className="text-sm bg-primary text-white px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save Document'}
                        </button>
                        <button onClick={() => setShowForm(false)} className="text-sm border border-border-strong px-3 py-1.5 rounded hover:bg-surface-secondary">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {documents.length > 0 && (
                <div className="space-y-2">
                    {documents.map(doc => {
                        const daysLeft = daysUntilExpiry(doc.expiryDate);
                        return (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-surface-secondary rounded">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{doc.formType.toUpperCase()}</span>
                                        {statusBadge(doc.status)}
                                    </div>
                                    <div className="text-xs text-text-muted mt-1">{doc.fullName}</div>
                                    {doc.expiryDate && (
                                        <div className={`text-xs mt-1 ${daysLeft !== null && daysLeft <= 30 ? 'text-yellow-600' : 'text-text-muted'}`}>
                                            Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                                            {daysLeft !== null && daysLeft <= 30 && ` (${daysLeft} days)`}
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-text-muted">
                                    {new Date(doc.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {documents.length === 0 && !loading && (
                <p className="text-text-muted text-sm">No tax documents found. Add a W-8BEN or W-9 to prevent tax withholding.</p>
            )}
        </section>
    );
}
