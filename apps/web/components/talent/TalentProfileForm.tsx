'use client';

import { FormEvent, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api';
import type { CandidateTalentProfile } from '../../lib/types';

type Props = { profile: CandidateTalentProfile; onSaved: (profile: CandidateTalentProfile) => void };

export function TalentProfileForm({ profile, onSaved }: Props) {
    const [form, setForm] = useState({ targetRole: profile.targetRole ?? '', headline: profile.headline ?? '', bio: profile.bio ?? '', skills: profile.skills.join(', '), location: profile.location ?? '', workModel: profile.workModel ?? '', availability: profile.availability ?? '', portfolioUrl: profile.portfolioUrl ?? '' });
    const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');
    const [message, setMessage] = useState('');
    async function submit(event: FormEvent) {
        event.preventDefault(); setState('saving'); setMessage('');
        try { const saved = await apiFetch<CandidateTalentProfile>('/api/blinkfy/talent/profile', { method: 'PATCH', body: JSON.stringify({ ...form, skills: form.skills.split(',').map((skill) => skill.trim()).filter(Boolean) }) }); onSaved(saved); setState('idle'); }
        catch (error) { setState('error'); setMessage(error instanceof ApiError ? error.message : 'Profile could not be saved.'); }
    }
    return <form onSubmit={submit} aria-label="Candidate profile">
        <label>Target role<input value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })} /></label>
        <label>Headline<input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></label>
        <label>Bio<textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
        <label>Skills<input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} aria-describedby="skills-help" /><small id="skills-help">Separate skills with commas.</small></label>
        <label>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
        <label>Work model<input value={form.workModel} onChange={(e) => setForm({ ...form, workModel: e.target.value })} /></label>
        <label>Availability<input value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} /></label>
        <label>Portfolio URL<input type="url" value={form.portfolioUrl} onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })} /></label>
        {state === 'error' && <p role="alert">{message}</p>}
        <button type="submit" disabled={state === 'saving'}>{state === 'saving' ? 'Saving…' : 'Save profile'}</button>
    </form>;
}
