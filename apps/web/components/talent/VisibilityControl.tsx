'use client';

import { useState } from 'react';
import type { CandidateVisibility } from '../../lib/types';

const descriptions: Record<CandidateVisibility, string> = { private: 'Only you can see your profile.', available: 'Verified recruiters can discover your profile, subject to your consent.', recruiters_only: 'Verified recruiters can discover your profile, but sharing still requires client-specific consent.', paused: 'Your profile is temporarily hidden from discovery.' };
const labels: Record<CandidateVisibility, string> = { private: 'Private', available: 'Available for opportunities', recruiters_only: 'Visible to verified recruiters', paused: 'Paused' };

export function VisibilityControl({ visibility, onChange }: { visibility: CandidateVisibility; onChange: (visibility: CandidateVisibility) => void }) {
    const [pending, setPending] = useState<CandidateVisibility | null>(null);
    return <section aria-labelledby="visibility-heading"><h2 id="visibility-heading">Profile visibility</h2><p>{labels[visibility]} — {descriptions[visibility]}</p><p>Confirm visibility change before it is saved.</p>
        <label htmlFor="visibility">Choose visibility</label><select id="visibility" value={pending ?? visibility} onChange={(e) => setPending(e.target.value as CandidateVisibility)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        {pending && pending !== visibility && <div role="dialog" aria-label="Confirm visibility change"><p>Confirm visibility change to {labels[pending]}?</p><button type="button" onClick={() => { onChange(pending); setPending(null); }}>Confirm visibility change</button><button type="button" onClick={() => setPending(null)}>Cancel</button></div>}
    </section>;
}
