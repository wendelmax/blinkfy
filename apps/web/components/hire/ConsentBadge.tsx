export function ConsentBadge({ consentRecorded }: { consentRecorded: boolean }) {
    return (
        <span
            aria-label={consentRecorded ? 'Client presentation consent recorded' : 'Client presentation consent required'}
            style={{ display: 'inline-block', borderRadius: 999, padding: '3px 8px', background: consentRecorded ? '#d9f8e5' : '#fff0cc', color: '#252525' }}
        >
            {consentRecorded ? 'Consent recorded' : 'Private — consent required'}
        </span>
    );
}
